/**
 * Importa "Gerencial Estoque Externo" (Revenda Mais, .XLS XML) — layout diferente da Lista Gerencial.
 *
 * Colunas: Codigo, Pos., Modelo, Ano, Cor, Placa, Status (USADO), Tipo, Dt. Compra, Dt. Venda, Situação, Marcador
 *
 * Regras:
 * - Estoque / Cadastrado → Vehicle disponivel (entrada de estoque)
 * - Vendido / Venda → Vehicle vendido + Sale (saída = venda; cliente placeholder se não houver relatório com cliente)
 * - Devolvido → Vehicle disponivel + nota (devolução consignação/externo)
 *
 * Idempotência: revendaMaisCodigo único. Se o veículo já existir (ex.: import da Lista Gerencial),
 * atualiza situação: disponivel→vendido cria Sale; não duplica veículo.
 *
 * .env: DATABASE_URL, IMPORT_DEFAULT_SELLER_ID (opcional)
 *
 * Uso:
 *   node scripts/importRevendaMaisEstoqueExterno.js [--dry-run] <arquivo.XLS> [...]
 */

require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

const TAG_PREFIX = 'RM-EST-EXT:'
const PLACEHOLDER_NAME = 'Importação — cliente não informado (estoque externo)'

function modelToBrandModel(full) {
  const s = String(full || '').trim() || '—'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { brand: s, model: '—' }
  return { brand: parts[0], model: parts.slice(1).join(' ') }
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

function plateVal(raw) {
  const plateRaw = String(raw || '').trim()
  return plateRaw && plateRaw !== '-' ? plateRaw.slice(0, 20) : null
}

function buildNotes(codigo, absPath, extras) {
  const parts = [`${TAG_PREFIX}${codigo}`, path.basename(absPath)]
  for (const e of extras) {
    if (e) parts.push(e)
  }
  return parts.join(' | ')
}

async function getPlaceholderCustomerId(dryRun) {
  if (dryRun) return null
  let c = await prisma.customer.findFirst({
    where: { name: PLACEHOLDER_NAME, phone: '—' },
    select: { id: true },
  })
  if (!c) {
    c = await prisma.customer.create({
      data: {
        name: PLACEHOLDER_NAME,
        phone: '—',
        pessoaType: 'Física',
        status: 'novo',
        marcador: 'Gerado pelo import estoque externo — substituir ao vincular venda real',
      },
      select: { id: true },
    })
  }
  return c.id
}

function mapSituacao(sitRaw) {
  const s = String(sitRaw || '')
    .trim()
    .toLowerCase()
  if (s === 'estoque') return 'estoque'
  if (s === 'vendido' || s === 'venda') return 'vendido'
  if (s === 'devolvido') return 'devolvido'
  if (s === 'cadastrado') return 'cadastrado'
  return 'unknown'
}

async function processFile(absPath, dryRun, sellerId, placeholderCustomerId) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(
    rows,
    (v) =>
      String(v[0] || '').trim() === 'Codigo' &&
      String(v[2] || '').trim() === 'Modelo' &&
      String(v[10] || '').trim() === 'Situação'
  )
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Gerencial Estoque Externo):', absPath)
    return { skippedFile: 1, created: 0, updated: 0, skipped: 0, errors: 0 }
  }

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo = String(v[0] || '').trim()
    if (!/^\d+$/.test(codigo)) {
      stats.skipped++
      continue
    }

    const modelo = String(v[2] || '').trim() || '—'
    const { brand, model } = modelToBrandModel(modelo)
    const year = parseAno(v[3])
    const color = String(v[4] || '').trim() || null
    const plate = plateVal(v[5])
    const conditionStatus = String(v[6] || '').trim() || null
    const tipo = String(v[7] || '').trim() || null
    const dtCompra = v[8]
    const dtVenda = v[9]
    const situacao = mapSituacao(v[10])
    const marcador = String(v[11] || '').trim()

    if (situacao === 'unknown') {
      stats.skipped++
      continue
    }

    const extras = []
    if (tipo) extras.push(`Tipo: ${tipo}`)
    if (marcador) extras.push(`Marcador: ${marcador}`)
    if (conditionStatus) extras.push(`Condição: ${conditionStatus}`)

    const notesBase = buildNotes(codigo, absPath, extras)

    try {
      const existing = await prisma.vehicle.findFirst({
        where: { revendaMaisCodigo: codigo },
        select: {
          id: true,
          status: true,
          notes: true,
          dataEntrada: true,
        },
      })

      const wantVendido = situacao === 'vendido'
      const wantDisponivel =
        situacao === 'estoque' || situacao === 'cadastrado' || situacao === 'devolvido'

      if (dryRun) {
        if (!existing) stats.created++
        else stats.updated++
        continue
      }

      if (!existing) {
        const dataCommon = {
          brand,
          model,
          year,
          color,
          plate,
          conditionStatus: conditionStatus ? conditionStatus.toLowerCase() : null,
          posicao: parseInt(String(v[1] || '0'), 10) || null,
          revendaMaisCodigo: codigo,
          notes: notesBase,
          dataEntrada: dtCompra ? parseSaleDate(dtCompra) : undefined,
        }

        if (wantDisponivel) {
          let note = notesBase
          if (situacao === 'devolvido') note += ' | Situação origem: Devolvido'
          if (situacao === 'cadastrado') note += ' | Situação origem: Cadastrado'

          await prisma.vehicle.create({
            data: {
              ...dataCommon,
              status: 'disponivel',
              notes: note,
            },
          })
          stats.created++
          continue
        }

        if (wantVendido) {
          if (!sellerId || !placeholderCustomerId) {
            stats.errors++
            continue
          }
          const saleDate = parseSaleDate(dtVenda || dtCompra)
          await prisma.$transaction(async (tx) => {
            const vehicle = await tx.vehicle.create({
              data: {
                ...dataCommon,
                status: 'vendido',
                customerId: placeholderCustomerId,
              },
            })
            await tx.sale.create({
              data: {
                customerId: placeholderCustomerId,
                vehicleId: vehicle.id,
                sellerId,
                status: 'concluida',
                date: saleDate,
                notes: `Venda (estoque externo) | ${TAG_PREFIX}${codigo}`,
              },
            })
          })
          stats.created++
        }
        continue
      }

      // Já existe veículo com mesmo código RM
      const existingSale = await prisma.sale.findUnique({
        where: { vehicleId: existing.id },
        select: { id: true },
      })

      if (wantVendido) {
        if (existing.status === 'vendido' && existingSale) {
          stats.skipped++
          continue
        }
        if (!sellerId || !placeholderCustomerId) {
          stats.errors++
          continue
        }
        const saleDate = parseSaleDate(dtVenda || dtCompra)
        await prisma.$transaction(async (tx) => {
          await tx.vehicle.update({
            where: { id: existing.id },
            data: {
              status: 'vendido',
              color: color || undefined,
              plate: plate ?? undefined,
              notes: existing.notes?.includes(TAG_PREFIX)
                ? existing.notes
                : `${notesBase} | ${existing.notes || ''}`.trim(),
              customerId: placeholderCustomerId,
              dataEntrada: existing.dataEntrada ? undefined : dtCompra ? parseSaleDate(dtCompra) : undefined,
            },
          })
          if (!existingSale) {
            await tx.sale.create({
              data: {
                customerId: placeholderCustomerId,
                vehicleId: existing.id,
                sellerId,
                status: 'concluida',
                date: saleDate,
                notes: `Venda (estoque externo) | ${TAG_PREFIX}${codigo}`,
              },
            })
          }
        })
        stats.updated++
        continue
      }

      if (wantDisponivel) {
        if (existing.status === 'vendido') {
          stats.skipped++
          continue
        }
        let note = notesBase
        if (situacao === 'devolvido') note += ' | Situação origem: Devolvido'
        if (situacao === 'cadastrado') note += ' | Situação origem: Cadastrado'
        await prisma.vehicle.update({
          where: { id: existing.id },
          data: {
            color: color || undefined,
            plate: plate ?? undefined,
            notes: note,
            dataEntrada: existing.dataEntrada ? undefined : dtCompra ? parseSaleDate(dtCompra) : undefined,
          },
        })
        stats.updated++
      }
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
      'Uso: node scripts/importRevendaMaisEstoqueExterno.js [--dry-run] <arquivo.XLS> [...]'
    )
    process.exit(1)
  }

  const defaultSellerId = process.env.IMPORT_DEFAULT_SELLER_ID
    ? parseInt(process.env.IMPORT_DEFAULT_SELLER_ID, 10)
    : null
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const sellerId = defaultSellerId || users[0]?.id || null

  if (!sellerId && !dryRun) {
    console.error('Nenhum vendedor: cadastre um User ou defina IMPORT_DEFAULT_SELLER_ID')
    process.exit(1)
  }

  const placeholderCustomerId = await getPlaceholderCustomerId(dryRun)

  let total = { created: 0, updated: 0, skipped: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    console.log(dryRun ? '[DRY-RUN]' : '[IMPORT]', abs)
    try {
      const s = await processFile(abs, dryRun, sellerId, placeholderCustomerId)
      total.created += s.created
      total.updated += s.updated
      total.skipped += s.skipped
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
