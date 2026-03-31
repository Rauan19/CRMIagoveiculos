/**
 * Importa "Lista Gerencial de Veículos Devolvidos" (Revenda Mais, .XLS XML).
 *
 * Cabeçalho:
 *  Código, Pos., Modelo, Ano, Cor, Placa, Data Compra, Data devolução, Localização
 *
 * Grava em VehicleDevolucao com idempotência por rowHash.
 * Também atualiza Vehicle (quando encontrado por revendaMaisCodigo) para refletir devolução:
 *  - mantém Vehicle.status como 'disponivel' (estoque)
 *  - preenche dataEntrada (Data Compra) se vazio
 *  - adiciona Location (Localização) se vier
 *
 * Uso:
 *   node scripts/importRevendaMaisVeiculosDevolvidos.js [--dry-run] <arquivo.XLS> [...]
 */
require('dotenv').config()
const path = require('path')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex, normalizeAscii } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex')
}

function parseDate(raw) {
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

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => {
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    return blob.includes('codigo') && blob.includes('data compra') && blob.includes('data devol') && blob.includes('placa')
  })
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Veículos Devolvidos):', absPath)
    return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  }

  const base = path.basename(absPath)
  const stats = { imported: 0, updated: 0, skippedRow: 0, errors: 0, skippedFile: 0 }

  const header = rows[headerIdx] || []
  const norm = header.map((x) => normalizeAscii(String(x || '').trim()))
  const idxOf = (pred) => {
    for (let i = 0; i < norm.length; i++) if (pred(norm[i])) return i
    return -1
  }
  const IDX = {
    codigo: idxOf((s) => s === 'codigo'),
    placa: idxOf((s) => s === 'placa'),
    dataCompra: idxOf((s) => s.includes('data') && s.includes('compra')),
    dataDevolucao: idxOf((s) => s.includes('data') && s.includes('devol')),
    localizacao: idxOf((s) => s.includes('localiza')),
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo = String(v[IDX.codigo] || '').trim()
    if (!codigo || codigo.toLowerCase().startsWith('total') || codigo.toLowerCase().startsWith('pagina')) {
      stats.skippedRow++
      continue
    }

    const dataCompra = parseDate(v[IDX.dataCompra])
    const dataDevolucao = parseDate(v[IDX.dataDevolucao])
    const localizacao = String(v[IDX.localizacao] || '').trim() || null

    const rowHash = sha1(
      JSON.stringify({
        sourceFile: base,
        codigo,
        dataCompra: dataCompra ? dataCompra.toISOString().slice(0, 10) : null,
        dataDevolucao: dataDevolucao ? dataDevolucao.toISOString().slice(0, 10) : null,
        localizacao,
      })
    )

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const vehicle = await prisma.vehicle.findFirst({
        where: { revendaMaisCodigo: codigo },
        select: { id: true, dataEntrada: true },
      })

      await prisma.$transaction(async (tx) => {
        await tx.vehicleDevolucao.create({
          data: {
            vehicleId: vehicle?.id || null,
            revendaMaisCodigo: codigo,
            dataCompra,
            dataDevolucao,
            localizacao,
            sourceFile: base,
            rowHash,
          },
        })

        if (vehicle?.id) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              status: 'disponivel',
              dataEntrada: vehicle.dataEntrada ? undefined : dataCompra || undefined,
              notes: undefined,
            },
          })
          if (localizacao) {
            await tx.location.create({
              data: {
                vehicleId: vehicle.id,
                location: localizacao.slice(0, 200),
                notes: `RM-DEV:${base}`.slice(0, 200),
              },
            })
          }
        }
      })

      stats.imported++
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('Unique constraint failed') || msg.includes('unique constraint')) {
        stats.updated++
      } else {
        stats.errors++
        console.warn('Erro (devolvido):', base, 'linha', i, e.message || e)
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
    console.error('Uso: node scripts/importRevendaMaisVeiculosDevolvidos.js [--dry-run] <arquivo.XLS> [...]')
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

