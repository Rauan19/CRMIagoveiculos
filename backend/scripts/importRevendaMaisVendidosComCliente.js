/**
 * Importa "Lista Gerencial de Veículos Vendidos com Cliente" (Revenda Mais, .XLS XML).
 *
 * Cria Customer (telefone placeholder se não houver), Vehicle (vendido), Sale (concluída).
 * Idempotência: campo Vehicle.revendaMaisCodigo = código do relatório (ou nota RMV: legado).
 *
 * Uso:
 *   node scripts/importRevendaMaisVendidosComCliente.js [--dry-run] <arquivo1.XLS> [arquivo2.XLS ...]
 *
 * .env: DATABASE_URL, IMPORT_DEFAULT_SELLER_ID (opcional)
 */
require('dotenv').config()
const path = require('path')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

const IMPORT_MERGE = String(process.env.IMPORT_MERGE || '').trim() === '1'
const IMPORT_FIX_SELLER = String(process.env.IMPORT_FIX_SELLER || '').trim() === '1'

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

function isMissingText(v) {
  const t = String(v || '').trim()
  return t === '' || t === '—' || t === '-'
}

function normName(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function parseAno(s) {
  const parts = String(s || '')
    .split('/')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
  if (parts.length >= 2) return parts[1]
  if (parts.length === 1) return parts[0]
  return new Date().getFullYear()
}

function parseSaleDate(raw) {
  if (!raw) return new Date()
  const t = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  return new Date()
}

function parseMoney(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.abs(n) : null
}

function findSellerId(vendedorName, users, fallbackId) {
  const n = normName(vendedorName)
  if (!n) return fallbackId
  const hit = users.find((u) => {
    const un = normName(u.name)
    return un === n || un.includes(n) || n.includes(un)
  })
  return hit ? hit.id : fallbackId
}

function slugifyEmailPart(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40)
}

function smallHash(s) {
  const str = String(s || '')
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h.toString(16)
}

async function ensureSellerUserId(tx, vendedorName, fallbackId) {
  const n = normName(vendedorName)
  if (!n) return fallbackId

  const existing = await tx.user.findFirst({
    where: { name: { equals: vendedorName.trim(), mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) return existing.id

  const base = slugifyEmailPart(vendedorName)
  const hash = smallHash(vendedorName)
  const emailBase = `import.vendedor+${base || 'sem-nome'}-${hash}`
  const passwordPlain = 'TrocarDepois123'
  const password = bcrypt.hashSync(passwordPlain, 10)

  // Tenta alguns emails para evitar colisão de unique
  for (let i = 0; i < 5; i++) {
    const email = `${emailBase}${i ? `.${i}` : ''}@local.crm`
    try {
      const u = await tx.user.create({
        data: {
          name: vendedorName.trim(),
          email,
          password,
          role: 'vendedor',
          receivesCommission: true,
        },
        select: { id: true },
      })
      return u.id
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('uniq')) continue
      throw e
    }
  }

  return fallbackId
}

async function processFile(absPath, dryRun, users, defaultSellerId) {
  const rows = parseSpreadsheetPath(absPath)
  const normCells = (v) => v.map((x) => String(x || '').trim())
  const idxOf = (cells, label) => cells.findIndex((c) => c === label)

  let layout = 'default'
  let headerIdx = findRowIndex(rows, (v) => v[1] === 'Código' && v[3] === 'Dt. Venda' && v[4] === 'Marca')
  let cols = null

  if (headerIdx !== -1) {
    const c = normCells(rows[headerIdx])
    cols = {
      codigo: idxOf(c, 'Código'),
      dtVenda: idxOf(c, 'Dt. Venda'),
      marca: idxOf(c, 'Marca'),
      modelo: idxOf(c, 'Modelo'),
      ano: idxOf(c, 'Ano'),
      cor: idxOf(c, 'Cor'),
      placa: idxOf(c, 'Placa'),
      cliente: idxOf(c, 'Cliente'),
      celular: idxOf(c, 'Celular'),
      vendedor: idxOf(c, 'Vendedor'),
      fornecedor: idxOf(c, 'Fornecedor'),
      compra: idxOf(c, 'Compra'),
      venda: idxOf(c, 'Venda'),
      lucro: idxOf(c, 'Lucro'),
    }
  }

  if (headerIdx === -1) {
    // Layout "completo" (compacto): Código | Dt. Venda | Modelo | Ano | Placa | Cliente | Celular
    headerIdx = findRowIndex(rows, (v) => {
      const c = normCells(v)
      return c.includes('Código') && c.includes('Dt. Venda') && c.includes('Modelo') && c.includes('Cliente')
    })
    if (headerIdx !== -1) {
      layout = 'compacto'
      const c = normCells(rows[headerIdx])
      cols = {
        codigo: idxOf(c, 'Código'),
        dtVenda: idxOf(c, 'Dt. Venda'),
        modelo: idxOf(c, 'Modelo'),
        ano: idxOf(c, 'Ano'),
        placa: idxOf(c, 'Placa'),
        cliente: idxOf(c, 'Cliente'),
        celular: idxOf(c, 'Celular'),
      }
    }
  }
  if (headerIdx === -1) {
    // "Relação de Vendidos com Cliente": Cod | Cliente | Modelo | Ano | Cor | Placa/Chassi | ... | Dt Venda | ... | Vl Entrada | Vl Saída
    headerIdx = findRowIndex(
      rows,
      (v) =>
        String(v[0] || '').trim() === 'Cod' &&
        String(v[1] || '').trim() === 'Cliente' &&
        String(v[2] || '').trim() === 'Modelo' &&
        String(v[8] || '').trim().toLowerCase().includes('dt') &&
        String(v[8] || '').trim().toLowerCase().includes('venda')
    )
    if (headerIdx !== -1) {
      layout = 'relacao'
      const c = normCells(rows[headerIdx])
      cols = {
        codigo: idxOf(c, 'Cod'),
        cliente: idxOf(c, 'Cliente'),
        modelo: idxOf(c, 'Modelo'),
        ano: idxOf(c, 'Ano'),
        cor: idxOf(c, 'Cor'),
        placa: idxOf(c, 'Placa/Chassi'),
        dtVenda: idxOf(c, 'Dt Venda'),
        vlEntrada: idxOf(c, 'Vl Entrada'),
        vlSaida: idxOf(c, 'Vl Saída'),
      }
    }
  }
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (esperado colunas Código, Dt. Venda, Marca):', absPath)
    return { skippedFile: 1, imported: 0, skippedRow: 0, errors: 0 }
  }

  const stats = { imported: 0, skippedRow: 0, errors: 0 }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo =
      layout === 'default'
        ? String(v[cols?.codigo] || v[1] || '').trim()
        : layout === 'compacto'
          ? String(v[cols?.codigo] || '').trim()
          : String(v[cols?.codigo] || '').trim()
    if (!/^\d+$/.test(codigo)) {
      stats.skippedRow++
      continue
    }

    const tag = `RMV:${codigo}`
    const existingV = await prisma.vehicle.findFirst({
      where: {
        OR: [{ revendaMaisCodigo: codigo }, { notes: { contains: tag } }],
      },
      select: {
        id: true,
        customerId: true,
        brand: true,
        model: true,
        year: true,
        color: true,
        plate: true,
        notes: true,
      },
    })
    if (existingV) {
      if (!IMPORT_MERGE) {
        stats.skippedRow++
        continue
      }
    }

    const cliente =
      layout === 'default'
        ? String(v[cols?.cliente] || v[27] || '').trim()
        : layout === 'compacto'
          ? String(v[cols?.cliente] || '').trim()
          : String(v[cols?.cliente] || '').trim()
    const vendedor =
      layout === 'default' ? String(v[cols?.vendedor] || v[29] || '').trim() : ''
    const fornecedor =
      layout === 'default' ? String(v[cols?.fornecedor] || v[30] || '').trim() : ''
    if (!cliente) {
      stats.skippedRow++
      continue
    }

    const sellerId = findSellerId(vendedor, users, defaultSellerId)
    if (!sellerId) {
      console.warn(`Sem vendedor para linha código ${codigo}; defina IMPORT_DEFAULT_SELLER_ID`)
      stats.errors++
      continue
    }

    let brand = '—'
    let model = '—'
    let year = new Date().getFullYear()
    let color = null
    let plateRaw = ''
    let saleDate = new Date()
    let salePrice = null
    let purchasePrice = null
    let profit = null

    if (layout === 'default') {
      brand = String(v[cols?.marca] || v[4] || '').trim() || '—'
      model = String(v[cols?.modelo] || v[5] || '').trim() || '—'
      year = parseAno(v[cols?.ano] ?? v[6])
      color = String(v[cols?.cor] || v[7] || '').trim() || null
      plateRaw = String(v[cols?.placa] || v[10] || '').trim()
      saleDate = parseSaleDate(v[cols?.dtVenda] ?? v[3])
      salePrice = parseMoney(v[cols?.venda] ?? v[23])
      purchasePrice = parseMoney(v[cols?.compra] ?? v[15])
      const lucroRaw = v[cols?.lucro] ?? v[26]
      profit = lucroRaw !== undefined && lucroRaw !== '' ? parseFloat(String(lucroRaw)) : null
    } else if (layout === 'compacto') {
      // Código | Dt. Venda | Modelo | Ano | Placa | Cliente | Celular
      const fullModel = String(v[cols?.modelo] || '').trim() || '—'
      const parts = fullModel.split(/\s+/).filter(Boolean)
      brand = parts[0] || fullModel
      model = parts.length > 1 ? parts.slice(1).join(' ') : '—'
      year = parseAno(v[cols?.ano])
      plateRaw = String(v[cols?.placa] || '').trim()
      saleDate = parseSaleDate(v[cols?.dtVenda])
    } else {
      // Relacao: Cod | Cliente | Modelo | Ano | Cor | Placa/Chassi | ... | Dt Venda | ... | Vl Entrada | Vl Saída
      const fullModel = String(v[cols?.modelo] || '').trim() || '—'
      const parts = fullModel.split(/\s+/).filter(Boolean)
      brand = parts[0] || fullModel
      model = parts.length > 1 ? parts.slice(1).join(' ') : '—'
      year = parseAno(v[cols?.ano])
      color = String(v[cols?.cor] || '').trim() || null
      plateRaw = String(v[cols?.placa] || '').trim()
      saleDate = parseSaleDate(v[cols?.dtVenda])
      purchasePrice = parseMoney(v[cols?.vlEntrada])
      salePrice = parseMoney(v[cols?.vlSaida])
      profit =
        salePrice != null && purchasePrice != null && Number.isFinite(salePrice) && Number.isFinite(purchasePrice)
          ? salePrice - purchasePrice
          : null
    }

    const plate = plateRaw && plateRaw !== '-' ? plateRaw.slice(0, 20) : null

    const notesParts = [`Import Revenda Mais`, tag]
    if (fornecedor) notesParts.push(`Fornecedor: ${fornecedor}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        const sellerIdTx =
          layout === 'default' && vendedor
            ? await ensureSellerUserId(tx, vendedor, sellerId)
            : sellerId

        const phone = '—'
        let customer =
          existingV?.customerId != null
            ? await tx.customer.findUnique({ where: { id: existingV.customerId } })
            : null

        if (!customer) {
          const inputPhone =
            layout === 'compacto'
              ? String(v[cols?.celular] || '').trim()
              : layout === 'default'
                ? String(v[cols?.celular] || '').trim()
                : ''
          const phoneToUse = inputPhone && inputPhone !== '-' ? inputPhone.slice(0, 30) : phone
          customer = await tx.customer.findFirst({
            where: {
              name: { equals: cliente, mode: 'insensitive' },
              phone: phoneToUse,
            },
          })
        }

        if (!customer) {
          const inputPhone =
            layout === 'compacto'
              ? String(v[cols?.celular] || '').trim()
              : layout === 'default'
                ? String(v[cols?.celular] || '').trim()
                : ''
          const phoneToUse = inputPhone && inputPhone !== '-' ? inputPhone.slice(0, 30) : phone
          customer = await tx.customer.create({
            data: {
              name: cliente,
              phone: phoneToUse,
              marcador: vendedor ? `Vendedor: ${vendedor}` : null,
              status: 'novo',
            },
          })
        }

        if (!existingV) {
          const vehicle = await tx.vehicle.create({
            data: {
              brand,
              model,
              year,
              color,
              plate,
              customerId: customer.id,
              status: 'vendido',
              revendaMaisCodigo: codigo,
              notes: `${tag} | ${path.basename(absPath)}`,
            },
          })

          await tx.sale.create({
            data: {
              customerId: customer.id,
              vehicleId: vehicle.id,
              sellerId: sellerIdTx,
              salePrice: salePrice != null ? salePrice : null,
              purchasePrice: purchasePrice != null ? purchasePrice : null,
              profit: profit != null && Number.isFinite(profit) ? profit : null,
              status: 'concluida',
              date: saleDate,
              notes: notesParts.join(' | '),
            },
          })
          return
        }

        const mergedNotes = existingV.notes?.includes(tag)
          ? existingV.notes
          : `${tag} | ${path.basename(absPath)} | ${existingV.notes || ''}`.trim()

        await tx.vehicle.update({
          where: { id: existingV.id },
          data: {
            status: 'vendido',
            customerId: existingV.customerId || customer.id,
            revendaMaisCodigo: codigo,
            brand: isMissingText(existingV.brand) ? brand : undefined,
            model: isMissingText(existingV.model) ? model : undefined,
            year: isBlank(existingV.year) ? year : undefined,
            color: isBlank(existingV.color) ? color : undefined,
            plate: isBlank(existingV.plate) ? plate : undefined,
            notes: mergedNotes,
          },
        })

        const existingSale = await tx.sale.findUnique({
          where: { vehicleId: existingV.id },
          select: {
            id: true,
            salePrice: true,
            purchasePrice: true,
            profit: true,
            date: true,
            sellerId: true,
            notes: true,
            customerId: true,
          },
        })

        if (!existingSale) {
          await tx.sale.create({
            data: {
              customerId: existingV.customerId || customer.id,
              vehicleId: existingV.id,
              sellerId: sellerIdTx,
              salePrice: salePrice != null ? salePrice : null,
              purchasePrice: purchasePrice != null ? purchasePrice : null,
              profit: profit != null && Number.isFinite(profit) ? profit : null,
              status: 'concluida',
              date: saleDate,
              notes: notesParts.join(' | '),
            },
          })
        } else {
          const nextNotes = existingSale.notes?.includes(tag)
            ? existingSale.notes
            : `${notesParts.join(' | ')} | ${existingSale.notes || ''}`.trim()

          // Corrige vendedor legado: se estava no usuário fallback e agora temos vendedor real, atualizar.
          let sellerUpdate = undefined
          if (IMPORT_FIX_SELLER && vendedor) {
            const fallbackId = await tx.user
              .findFirst({
                where: {
                  OR: [
                    { email: 'import.revendamais@local.crm' },
                    { name: { equals: 'Importação Revenda Mais', mode: 'insensitive' } },
                  ],
                },
                select: { id: true },
              })
              .then((x) => x?.id || null)
            if (fallbackId && existingSale.sellerId === fallbackId && sellerIdTx !== fallbackId) {
              sellerUpdate = sellerIdTx
            }
          }

          await tx.sale.update({
            where: { id: existingSale.id },
            data: {
              customerId: existingSale.customerId || (existingV.customerId || customer.id),
              sellerId: (sellerUpdate ?? existingSale.sellerId) || sellerIdTx,
              salePrice: existingSale.salePrice == null ? (salePrice != null ? salePrice : null) : undefined,
              purchasePrice:
                existingSale.purchasePrice == null
                  ? purchasePrice != null
                    ? purchasePrice
                    : null
                  : undefined,
              profit:
                existingSale.profit == null
                  ? profit != null && Number.isFinite(profit)
                    ? profit
                    : null
                  : undefined,
              date: existingSale.date ? undefined : saleDate,
              notes: nextNotes,
            },
          })
        }
      })
      stats.imported++
    } catch (e) {
      stats.errors++
      console.warn(`Erro código ${codigo}:`, e.message || e)
    }
  }

  return { skippedFile: 0, ...stats }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (args.length === 0) {
    console.error(
      'Uso: node scripts/importRevendaMaisVendidosComCliente.js [--dry-run] <arquivo.XLS> [outro.XLS ...]'
    )
    process.exit(1)
  }

  const defaultSellerId = process.env.IMPORT_DEFAULT_SELLER_ID
    ? parseInt(process.env.IMPORT_DEFAULT_SELLER_ID, 10)
    : null
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const fallback = defaultSellerId || users[0]?.id || null

  let total = { imported: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    console.log(dryRun ? '[DRY-RUN]' : '[IMPORT]', abs)
    try {
      const s = await processFile(abs, dryRun, users, fallback)
      total.imported += s.imported
      total.skippedRow += s.skippedRow
      total.errors += s.errors
      total.skippedFile += s.skippedFile || 0
    } catch (e) {
      console.error('Falha:', abs, e.message || e)
      total.skippedFile++
    }
  }

  console.log(dryRun ? 'Resumo (dry-run):' : 'Resumo:')
  console.log(JSON.stringify(total, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
