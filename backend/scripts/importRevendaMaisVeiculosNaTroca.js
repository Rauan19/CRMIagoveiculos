/**
 * Importa "Veículos na troca" (Revenda Mais, .XLS XML).
 *
 * Cabeçalho:
 *  Código, Dt. Venda, Modelo, Ano, Cor, Placa/Chassi, Pos., Tipo, Venda, Veículo na troca, Valor Líquido, Outras Formas, Fornecedor
 *
 * Grava em SaleTroca (resumo) com idempotência por rowHash.
 * Não tenta quebrar "Veículo na troca" em Vehicle completo (pode ser texto livre); guarda bruto + valores.
 *
 * Uso:
 *   node scripts/importRevendaMaisVeiculosNaTroca.js [--dry-run] <arquivo.XLS> [...]
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
  const n = Number(
    s
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
  )
  return Number.isFinite(n) ? n : null
}

async function resolveSaleAndVehicle({ codigo }) {
  if (!codigo) return { saleId: null, vehicleId: null }
  const v = await prisma.vehicle.findFirst({
    where: { revendaMaisCodigo: codigo },
    select: { id: true, sale: { select: { id: true } } },
  })
  return { saleId: v?.sale?.id || null, vehicleId: v?.id || null }
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => {
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    return blob.includes('codigo') && blob.includes('veiculo na troca') && blob.includes('outras formas')
  })
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Veículos na troca):', absPath)
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
    dtVenda: idxOf((s) => s.includes('dt') && s.includes('venda')),
    venda: idxOf((s) => s === 'venda'),
    veiculoTroca: idxOf((s) => s.includes('veiculo') && s.includes('troca')),
    valorLiquido: idxOf((s) => s.includes('valor') && s.includes('liquido')),
    outrasFormas: idxOf((s) => s.includes('outras') && s.includes('formas')),
    fornecedor: idxOf((s) => s === 'fornecedor'),
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo = String(v[IDX.codigo] || '').trim()
    if (!codigo || codigo.toLowerCase().startsWith('total') || codigo.toLowerCase().startsWith('pagina')) {
      stats.skippedRow++
      continue
    }

    const dtVenda = parsePtBrDate(v[IDX.dtVenda])
    const valorVenda = safeMoney(v[IDX.venda])
    const veiculoTrocaRaw = String(v[IDX.veiculoTroca] || '').trim() || null
    const valorLiquido = safeMoney(v[IDX.valorLiquido])
    const outrasFormas = safeMoney(v[IDX.outrasFormas])
    const fornecedor = String(v[IDX.fornecedor] || '').trim() || null

    // Em alguns casos o relatório traz o valor da troca na coluna seguinte (linhas com 2 colunas extras).
    // Como o parser coloca em colunas reais, a melhor heurística é: se "valorLiquido" vier null e outrasFormas tiver valor,
    // manter como está; valorTroca pode estar embutido no texto do veiculoTrocaRaw.
    const valorTroca = null

    const rowHash = sha1(
      JSON.stringify({
        sourceFile: base,
        codigo,
        dtVenda: dtVenda ? dtVenda.toISOString().slice(0, 10) : null,
        valorVenda,
        veiculoTrocaRaw,
      })
    )

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const { saleId, vehicleId } = await resolveSaleAndVehicle({ codigo })
      await prisma.saleTroca.create({
        data: {
          saleId,
          vehicleId,
          revendaMaisCodigo: codigo,
          dtVenda,
          valorVenda,
          veiculoTrocaRaw,
          valorTroca,
          outrasFormas,
          valorLiquido,
          fornecedor,
          sourceFile: base,
          rowHash,
        },
      })
      stats.imported++
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('Unique constraint failed') || msg.includes('unique constraint')) {
        stats.updated++
      } else {
        stats.errors++
        console.warn('Erro (troca):', base, 'linha', i, e.message || e)
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
    console.error('Uso: node scripts/importRevendaMaisVeiculosNaTroca.js [--dry-run] <arquivo.XLS> [...]')
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

