/**
 * Relatório Canal de Venda — atualiza Sale.saleChannel / saleChannelNotes.
 * Dois layouts: (A) sem coluna Código; (B) com Código + colunas deslocadas.
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex, normalizeAscii } = require('./lib/revendamaisXml')
const { findVehicleByPlateLoose } = require('./lib/vehiclePlateMatch')

const prisma = new PrismaClient()

function mapChannel(raw) {
  const s = normalizeAscii(String(raw || ''))
  if (s.includes('visita')) return 'loja'
  if (s.includes('online')) return 'online'
  if (s.includes('telefone')) return 'telefone'
  if (s.includes('indica')) return 'indicacao'
  if (s.includes('outro')) return 'outro'
  return 'outro'
}

async function findVehicleWithSale(codigoOpt, plateRaw) {
  if (codigoOpt && /^\d+$/.test(codigoOpt)) {
    const byCod = await prisma.vehicle.findUnique({
      where: { revendaMaisCodigo: codigoOpt },
      include: { sale: true },
    })
    if (byCod?.sale) return byCod
  }
  const hit = await findVehicleByPlateLoose(prisma, plateRaw)
  if (!hit) return null
  return prisma.vehicle.findUnique({
    where: { id: hit.id },
    include: { sale: true },
  })
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)

  const hiA = findRowIndex(
    rows,
    (v) =>
      v[0] === 'Vendedor' &&
      v[1] === 'Dt. Venda' &&
      String(v[10] || '')
        .toLowerCase()
        .includes('placa')
  )
  const hiB = findRowIndex(
    rows,
    (v) =>
      v[0] === 'Código' &&
      v[1] === 'Vendedor' &&
      String(v[12] || '')
        .toLowerCase()
        .includes('placa')
  )

  let hi = -1
  let layout = ''
  if (hiA >= 0) {
    hi = hiA
    layout = 'A'
  } else if (hiB >= 0) {
    hi = hiB
    layout = 'B'
  }

  if (hi === -1) {
    console.warn('[SKIP] Canal de Venda — cabeçalho não encontrado', absPath)
    return { skippedFile: 1, updated: 0, skipped: 0, errors: 0 }
  }

  const stats = { updated: 0, skipped: 0, errors: 0 }
  for (let i = hi + 1; i < rows.length; i++) {
    const v = rows[i]
    let codigoOpt = ''
    let plateRaw = ''
    let canal = ''
    let obs = ''

    if (layout === 'A') {
      plateRaw = String(v[10] || '').trim()
      canal = String(v[11] || '').trim()
      obs = String(v[13] || '').trim()
    } else {
      codigoOpt = String(v[0] || '').trim()
      plateRaw = String(v[12] || '').trim()
      canal = String(v[15] || '').trim()
      obs = String(v[17] || '').trim()
    }

    if (!plateRaw && !codigoOpt) {
      stats.skipped++
      continue
    }

    const vehicle = await findVehicleWithSale(codigoOpt, plateRaw)
    if (!vehicle?.sale) {
      stats.skipped++
      continue
    }

    if (dryRun) {
      stats.updated++
      continue
    }

    try {
      await prisma.sale.update({
        where: { id: vehicle.sale.id },
        data: {
          saleChannel: mapChannel(canal),
          saleChannelNotes: [canal, obs].filter(Boolean).join(' — ').slice(0, 500) || null,
        },
      })
      stats.updated++
    } catch (e) {
      stats.errors++
      console.warn(plateRaw || codigoOpt, e.message)
    }
  }

  return { skippedFile: 0, ...stats }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisCanalVenda.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }
  let t = { updated: 0, skipped: 0, errors: 0, skippedFile: 0 }
  for (const f of args) {
    const abs = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f)
    const s = await processFile(abs, dryRun)
    t.updated += s.updated
    t.skipped += s.skipped
    t.errors += s.errors
    t.skippedFile += s.skippedFile || 0
  }
  console.log(JSON.stringify(t, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
