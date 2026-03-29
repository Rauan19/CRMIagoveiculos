/**
 * Lista Gerencial de Estoque com Documentação — sem coluna Código; casa por placa.
 * Cria veículo disponível ou atualiza renavam/tipo se já existir (mesma placa).
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')
const { findVehicleByPlateLoose } = require('./lib/vehiclePlateMatch')

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

function modelToBrandModel(full) {
  const s = String(full || '').trim() || '—'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { brand: s.slice(0, 80), model: '—' }
  return { brand: parts[0].slice(0, 80), model: parts.slice(1).join(' ').slice(0, 120) }
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => v[1] === 'Pos.' && v[2] === 'Modelo' && v[5] === 'Placa')
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho Estoque com Documentação não reconhecido:', absPath)
    return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  }

  const stats = { imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  const base = path.basename(absPath)

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const modelo = String(v[2] || '').trim()
    const plateRaw = String(v[5] || '').trim()
    if (!modelo || !plateRaw || plateRaw === '-') {
      stats.skippedRow++
      continue
    }

    const { brand, model } = modelToBrandModel(modelo)
    const year = parseAno(v[3])
    const color = String(v[4] || '').trim() || null
    const renavamRaw = String(v[8] || '').trim()
    const renavam = /^\d{5,}$/.test(renavamRaw) ? renavamRaw.slice(0, 20) : null
    const tipo = String(v[13] || '').trim() || null

    const existing = await findVehicleByPlateLoose(prisma, plateRaw)
    const tag = `RM-DOC:${base}`

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      if (existing) {
        const cur = await prisma.vehicle.findUnique({
          where: { id: existing.id },
          select: { notes: true },
        })
        const nextNotes = cur?.notes?.includes('RM-DOC:')
          ? cur.notes
          : [cur?.notes, tipo ? `Tipo(doc): ${tipo}` : null, tag].filter(Boolean).join(' | ')
        await prisma.vehicle.update({
          where: { id: existing.id },
          data: {
            ...(renavam ? { renavam } : {}),
            notes: nextNotes.slice(0, 4000),
          },
        })
        stats.updated++
        continue
      }

      await prisma.vehicle.create({
        data: {
          brand,
          model,
          year,
          color,
          plate: plateRaw.slice(0, 20),
          renavam,
          status: 'disponivel',
          notes: `${tag} | placa import doc`,
        },
      })
      stats.imported++
    } catch (e) {
      stats.errors++
      console.warn(`Erro placa ${plateRaw}:`, e.message || e)
    }
  }

  return { skippedFile: 0, ...stats }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisEstoqueDocumentacao.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }
  let t = { imported: 0, updated: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    const s = await processFile(abs, dryRun).catch((e) => {
      console.error(abs, e.message)
      return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
    })
    Object.keys(t).forEach((k) => (t[k] += s[k] || 0))
  }
  console.log(dryRun ? 'Dry-run:' : 'OK:', JSON.stringify(t, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
