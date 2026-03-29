/**
 * Importa "Lista Gerencial de Estoque" (Revenda Mais, .XLS XML).
 *
 * Cria Vehicle com status disponivel. Idempotência: pula se existir veículo com notas contendo RM-EST:<código>.
 *
 * Uso:
 *   node scripts/importRevendaMaisEstoqueGerencial.js [--dry-run] <arquivo.XLS> [outro.XLS ...]
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

function parseAno(s) {
  const parts = String(s || '')
    .split('/')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
  if (parts.length >= 2) return parts[1]
  if (parts.length === 1) return parts[0]
  return new Date().getFullYear()
}

function parseKm(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  const n = parseInt(String(raw).replace(/\./g, '').replace(/,/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function parseMoney(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  const n = parseFloat(String(raw))
  return Number.isFinite(n) ? Math.abs(n) : null
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(
    rows,
    (v) => v[1] === 'Código' && v[3] === 'Marca' && v[4] === 'Modelo'
  )
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Lista Gerencial de Estoque):', absPath)
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

    const tag = `RM-EST:${codigo}`
    const existing = await prisma.vehicle.findFirst({
      where: {
        OR: [{ revendaMaisCodigo: codigo }, { notes: { contains: tag } }],
      },
      select: { id: true },
    })
    if (existing) {
      stats.skippedRow++
      continue
    }

    const brand = String(v[3] || '').trim() || '—'
    const model = String(v[4] || '').trim() || '—'
    const year = parseAno(v[5])
    const color = String(v[6] || '').trim() || null
    const plateRaw = String(v[7] || '').trim()
    const plate = plateRaw && plateRaw !== '-' ? plateRaw.slice(0, 20) : null
    const km = parseKm(v[9])
    const renavam = String(v[10] || '').trim() || null
    const combustivel = String(v[11] || '').trim() || null
    const cambio = String(v[12] || '').trim() || null
    const cost = parseMoney(v[27]) ?? parseMoney(v[22])
    const fornecedor = String(v[45] || '').trim()
    const docNome = String(v[48] || '').trim()

    const notes = [tag, path.basename(absPath)]
    if (fornecedor) notes.push(`Fornecedor: ${fornecedor}`)
    if (docNome) notes.push(`Doc nome: ${docNome}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      await prisma.vehicle.create({
        data: {
          brand,
          model,
          year,
          color,
          plate,
          km,
          renavam,
          combustivel,
          cambio,
          cost: cost != null ? cost : null,
          status: 'disponivel',
          revendaMaisCodigo: codigo,
          notes: notes.join(' | '),
        },
      })
      stats.imported++
    } catch (e) {
      stats.errors++
      console.warn(`Erro código estoque ${codigo}:`, e.message || e)
    }
  }

  return { skippedFile: 0, ...stats }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (args.length === 0) {
    console.error(
      'Uso: node scripts/importRevendaMaisEstoqueGerencial.js [--dry-run] <arquivo.XLS> [outro.XLS ...]'
    )
    process.exit(1)
  }

  let total = { imported: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    console.log(dryRun ? '[DRY-RUN]' : '[IMPORT]', abs)
    try {
      const s = await processFile(abs, dryRun)
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
