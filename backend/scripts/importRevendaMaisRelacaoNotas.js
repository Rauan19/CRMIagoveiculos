/**
 * Importa "Relação de Notas" (Revenda Mais, .XLS XML).
 *
 * Cabeçalho:
 *  Cod, Marca, Modelo, Ano, Cor, Placa/Chassi, Pos, Tipo, Nota, Dt Nota, CFOP, NCM, CST, ICMS, Nome Dest, Filial, Vl Entrada, Vl Saída
 *
 * Grava em VehicleNota com idempotência por rowHash (sourceFile + campos chave).
 * Faz vínculo com Vehicle por revendaMaisCodigo (preferencial) ou por placa/chassi (best-effort).
 *
 * Uso:
 *   node scripts/importRevendaMaisRelacaoNotas.js [--dry-run] <arquivo.XLS> [...]
 */
require('dotenv').config()
const path = require('path')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex, normalizePlate } = require('./lib/revendamaisXml')
const { findVehicleByPlateLoose } = require('./lib/vehiclePlateMatch')

const prisma = new PrismaClient()

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex')
}

function parsePtBrDate(raw) {
  if (!raw) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  const t = String(raw).trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function safeMoney(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function resolveVehicleId({ codigo, plateOrChassi }) {
  if (codigo) {
    const v = await prisma.vehicle.findFirst({
      where: { revendaMaisCodigo: codigo },
      select: { id: true },
    })
    if (v) return v.id
  }

  // Best-effort: se for placa, tenta casar.
  const n = normalizePlate(plateOrChassi)
  if (n && n.length >= 5) {
    const byPlate = await findVehicleByPlateLoose(prisma, plateOrChassi)
    if (byPlate) return byPlate.id
  }

  return null
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(
    rows,
    (v) => String(v[0] || '').trim() === 'Cod' && String(v[8] || '').trim().toLowerCase() === 'nota'
  )
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Relação de Notas):', absPath)
    return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  }

  const base = path.basename(absPath)
  const stats = { imported: 0, updated: 0, skippedRow: 0, errors: 0, skippedFile: 0 }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const cod = String(v[0] || '').trim()
    const plateOrChassi = String(v[5] || '').trim()
    const nota = String(v[8] || '').trim()
    const dtNota = parsePtBrDate(v[9])

    // Linhas "Total:" etc.
    if (!cod || cod.toLowerCase().startsWith('total')) {
      stats.skippedRow++
      continue
    }

    const rowHash = sha1(
      JSON.stringify({
        sourceFile: base,
        cod,
        plateOrChassi,
        nota,
        dtNota: dtNota ? dtNota.toISOString().slice(0, 10) : null,
        cfop: String(v[10] || '').trim(),
      })
    )

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const vehicleId = await resolveVehicleId({ codigo: cod, plateOrChassi })
      await prisma.vehicleNota.create({
        data: {
          vehicleId,
          revendaMaisCodigo: cod || null,
          plateOrChassi: plateOrChassi || null,
          nota: nota || null,
          dtNota,
          cfop: String(v[10] || '').trim() || null,
          ncm: String(v[11] || '').trim() || null,
          cst: String(v[12] || '').trim() || null,
          icms: safeMoney(v[13]),
          nomeDest: String(v[14] || '').trim() || null,
          filial: String(v[15] || '').trim() || null,
          valorEntrada: safeMoney(v[16]),
          valorSaida: safeMoney(v[17]),
          sourceFile: base,
          rowHash,
        },
      })
      stats.imported++
    } catch (e) {
      // idempotência: já existe
      const msg = String(e?.message || '')
      if (msg.includes('Unique constraint failed') || msg.includes('unique constraint')) {
        stats.updated++
      } else {
        stats.errors++
        console.warn('Erro (nota):', base, 'linha', i, e.message || e)
      }
    }
  }

  return stats
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const args = argv.filter((a) => a !== '--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisRelacaoNotas.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }

  let total = { imported: 0, updated: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    console.log(dryRun ? '[DRY-RUN]' : '[IMPORT]', abs)
    const s = await processFile(abs, dryRun).catch((e) => {
      console.error('Falha:', abs, e.message || e)
      return { imported: 0, updated: 0, skippedRow: 0, errors: 1, skippedFile: 1 }
    })
    total.imported += s.imported || 0
    total.updated += s.updated || 0
    total.skippedRow += s.skippedRow || 0
    total.errors += s.errors || 0
    total.skippedFile += s.skippedFile || 0
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

