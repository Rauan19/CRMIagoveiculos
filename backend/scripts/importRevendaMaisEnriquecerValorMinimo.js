/**
 * Listagem com valor mínimo da Venda — atualiza price, valorMinimoVenda, precoPromocional por placa.
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath } = require('./lib/revendamaisXml')
const { findVehicleByPlateLoose } = require('./lib/vehiclePlateMatch')

const prisma = new PrismaClient()

function parseAno(s) {
  const parts = String(s || '')
    .split('/')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
  if (parts.length >= 2) return parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

function num(raw) {
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const stats = { updated: 0, skipped: 0, errors: 0 }

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]
    if (String(v[0] || '').trim() === 'Modelo') continue
    const plate = String(v[3] || '').trim()
    if (!plate) {
      stats.skipped++
      continue
    }

    const vlrVenda = num(v[8])
    const minVenda = num(v[9])
    const webPromo = num(v[11])
    const ano = parseAno(String(v[1] || ''))

    const hit = await findVehicleByPlateLoose(prisma, plate)
    if (!hit) {
      stats.skipped++
      continue
    }

    if (dryRun) {
      stats.updated++
      continue
    }

    try {
      await prisma.vehicle.update({
        where: { id: hit.id },
        data: {
          ...(vlrVenda != null ? { price: vlrVenda } : {}),
          ...(minVenda != null ? { valorMinimoVenda: minVenda } : {}),
          ...(webPromo != null ? { precoPromocional: webPromo } : {}),
          ...(ano ? { anoModelo: ano } : {}),
        },
      })
      stats.updated++
    } catch (e) {
      stats.errors++
      console.warn(plate, e.message)
    }
  }

  return stats
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisEnriquecerValorMinimo.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }
  let t = { updated: 0, skipped: 0, errors: 0 }
  for (const f of args) {
    const abs = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f)
    const s = await processFile(abs, dryRun)
    t.updated += s.updated
    t.skipped += s.skipped
    t.errors += s.errors
  }
  console.log(JSON.stringify(t, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
