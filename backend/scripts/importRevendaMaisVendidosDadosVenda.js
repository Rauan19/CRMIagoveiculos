/**
 * Importa "Lista Gerencial de Veículos Vendidos com Dados Da Venda" (Revenda Mais, .XLS XML).
 * Não traz coluna Marca nem Vendedor; usa primeiro token do modelo como marca e IMPORT_DEFAULT_SELLER_ID / primeiro User.
 *
 * Idempotência: mesmo código RMV:<código> que importRevendaMaisVendidosComCliente.js — não duplica se já importou pelo outro relatório.
 *
 * Uso:
 *   node scripts/importRevendaMaisVendidosDadosVenda.js [--dry-run] <arquivo.XLS> [outro.XLS ...]
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

const IMPORT_MERGE = String(process.env.IMPORT_MERGE || '').trim() === '1'

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

function isMissingText(v) {
  const t = String(v || '').trim()
  return t === '' || t === '—' || t === '-'
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

function modelToBrandModel(full) {
  const s = String(full || '').trim() || '—'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { brand: s, model: '—' }
  return { brand: parts[0], model: parts.slice(1).join(' ') }
}

async function processFile(absPath, dryRun, fallbackSellerId) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(
    rows,
    (v) => v[1] === 'Código' && v[3] === 'Dt. Venda' && v[4] === 'Modelo'
  )
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Dados Da Venda):', absPath)
    return { skippedFile: 1, imported: 0, skippedRow: 0, errors: 0 }
  }

  const stats = { imported: 0, skippedRow: 0, errors: 0 }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo = String(v[1] || '').trim()
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

    const cliente = String(v[29] || '').trim()
    if (!cliente) {
      stats.skippedRow++
      continue
    }

    if (!fallbackSellerId) {
      console.warn(`Sem IMPORT_DEFAULT_SELLER_ID / usuário para código ${codigo}`)
      stats.errors++
      continue
    }

    const { brand, model } = modelToBrandModel(v[4])
    const year = parseAno(v[5])
    const color = String(v[6] || '').trim() || null
    const plateRaw = String(v[7] || '').trim()
    const plate = plateRaw && plateRaw !== '-' ? plateRaw.slice(0, 20) : null
    const saleDate = parseSaleDate(v[3])
    const salePrice = parseMoney(v[25])
    const purchasePrice = parseMoney(v[14])
    const lucroRaw = v[28]
    const profit = lucroRaw !== undefined && lucroRaw !== '' ? parseFloat(String(lucroRaw)) : null
    const sexo = String(v[31] || '').trim() || null
    const fornecedor = String(v[32] || '').trim()
    const cidade = String(v[34] || '').trim()

    const notesParts = [`Import Revenda Mais (Dados Venda)`, tag]
    if (fornecedor) notesParts.push(`Fornecedor: ${fornecedor}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        const phone = '—'
        let customer =
          existingV?.customerId != null
            ? await tx.customer.findUnique({ where: { id: existingV.customerId } })
            : null

        if (!customer) {
          customer = await tx.customer.findFirst({
            where: {
              name: { equals: cliente, mode: 'insensitive' },
              phone,
            },
          })
        }

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: cliente,
              phone,
              sexo: sexo || null,
              city: cidade || null,
              marcador: 'Import RM Dados Venda',
              status: 'novo',
            },
          })
        } else {
          // Enriquecimento leve: só preenche se ainda não houver
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              sexo: customer.sexo ? undefined : sexo || null,
              city: customer.city ? undefined : cidade || null,
            },
          })
        }

        const brand80 = brand.slice(0, 80)
        const model120 = model.slice(0, 120)

        if (!existingV) {
          const vehicle = await tx.vehicle.create({
            data: {
              brand: brand80,
              model: model120,
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
              sellerId: fallbackSellerId,
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
            brand: isMissingText(existingV.brand) ? brand80 : undefined,
            model: isMissingText(existingV.model) ? model120 : undefined,
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
              sellerId: fallbackSellerId,
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
          await tx.sale.update({
            where: { id: existingSale.id },
            data: {
              customerId: existingSale.customerId || (existingV.customerId || customer.id),
              sellerId: existingSale.sellerId || fallbackSellerId,
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
      'Uso: node scripts/importRevendaMaisVendidosDadosVenda.js [--dry-run] <arquivo.XLS> [outro.XLS ...]'
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
      const s = await processFile(abs, dryRun, fallback)
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
