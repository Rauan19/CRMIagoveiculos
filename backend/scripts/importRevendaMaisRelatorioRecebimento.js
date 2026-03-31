/**
 * Importa "Relatório de Recebimento" (Revenda Mais, .XLS XML) como consolidação financeira por venda.
 *
 * IMPORTANTE: este relatório é agregado por veículo/venda e NÃO lista cada título pago.
 * Então aqui a estratégia segura é:
 * - gravar/atualizar campos de Sale (salePrice/purchasePrice/profit) quando estiverem vazios
 * - NÃO dar baixa automática em FinancialTransaction (isso exige detalhe de cada título)
 *
 * Cabeçalho:
 *  Código, Pos., Dt. Venda, Modelo, Ano, Cor, Placa, Tipo, Dias, Compra, Lançamentos, Total, Venda, Retorno, Lucro, Títulos Aberto, Localização
 *
 * Uso:
 *   node scripts/importRevendaMaisRelatorioRecebimento.js [--dry-run] <arquivo.XLS> [...]
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex, normalizeAscii } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

function normalizePlate(s) {
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!t) return null
  return t
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

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  // Header real é a linha cujo 1º valor é "Código" e contém "Dt. Venda" e "Títulos Aberto"
  const hi = findRowIndex(
    rows,
    (v) =>
      normalizeAscii(String(v?.[0] || '').trim()) === 'codigo' &&
      normalizeAscii(v.filter(Boolean).join(' ')).includes('dt') &&
      normalizeAscii(v.filter(Boolean).join(' ')).includes('venda') &&
      normalizeAscii(v.filter(Boolean).join(' ')).includes('titulos aberto')
  )
  if (hi === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Relatório de Recebimento):', absPath)
    return { skippedFile: 1, updatedSales: 0, skippedRow: 0, errors: 0 }
  }

  const base = path.basename(absPath)
  const stats = { updatedSales: 0, skippedRow: 0, errors: 0, skippedFile: 0 }

  const header = rows[hi] || []
  const norm = header.map((x) => normalizeAscii(String(x || '').trim()))
  const idxOf = (pred) => {
    for (let i = 0; i < norm.length; i++) if (pred(norm[i])) return i
    return -1
  }
  const IDX = {
    codigo: idxOf((s) => s === 'codigo'),
    dtVenda: idxOf((s) => s.includes('dt') && s.includes('venda')),
    placa: idxOf((s) => s === 'placa'),
    compra: idxOf((s) => s === 'compra'),
    venda: idxOf((s) => s === 'venda'),
    lucro: idxOf((s) => s === 'lucro'),
    titulosAberto: idxOf((s) => s.includes('titulos') && s.includes('aberto')),
    localizacao: idxOf((s) => s.includes('localiza')),
  }

  for (let i = hi + 1; i < rows.length; i++) {
    const v = rows[i]
    const codigo = String(v[IDX.codigo] || '').trim()
    if (!codigo || codigo.toLowerCase().startsWith('total') || codigo.toLowerCase().startsWith('pagina')) {
      stats.skippedRow++
      continue
    }
    const dtVenda = parseDate(v[IDX.dtVenda])
    const placa = normalizePlate(v[IDX.placa])
    const compra = safeMoney(v[IDX.compra])
    const venda = safeMoney(v[IDX.venda])
    const lucro = safeMoney(v[IDX.lucro])
    const titulosAberto = safeMoney(v[IDX.titulosAberto])
    const localizacao = String(v[IDX.localizacao] || '').trim() || null

    if (dryRun) {
      stats.updatedSales++
      continue
    }

    try {
      let vehicle = await prisma.vehicle.findFirst({
        where: { revendaMaisCodigo: codigo },
        select: { id: true, sale: { select: { id: true, purchasePrice: true, salePrice: true, profit: true, date: true, notes: true } } },
      })
      if (!vehicle && placa) {
        vehicle = await prisma.vehicle.findFirst({
          where: { plate: placa },
          select: { id: true, sale: { select: { id: true, purchasePrice: true, salePrice: true, profit: true, date: true, notes: true } } },
        })
      }
      if (!vehicle?.sale?.id) {
        stats.skippedRow++
        continue
      }

      await prisma.sale.update({
        where: { id: vehicle.sale.id },
        data: {
          date: vehicle.sale.date ? undefined : dtVenda || undefined,
          purchasePrice: vehicle.sale.purchasePrice == null && compra != null ? Math.abs(compra) : undefined,
          salePrice: vehicle.sale.salePrice == null && venda != null ? venda : undefined,
          profit: vehicle.sale.profit == null && lucro != null ? lucro : undefined,
          notes: localizacao ? `${vehicle.sale.notes || ''} | RM-REC:${base} | Localização: ${localizacao}`.trim().slice(0, 4000) : undefined,
        },
      })
      // Opcional: poderia também atualizar Location, mas já existe módulo de Location.
      stats.updatedSales++
    } catch (e) {
      stats.errors++
      console.warn('Erro (recebimento):', base, 'linha', i, e.message || e)
    }
  }

  return stats
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const args = argv.filter((a) => a !== '--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisRelatorioRecebimento.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }

  let total = { updatedSales: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    console.log(dryRun ? '[DRY-RUN]' : '[IMPORT]', abs)
    const s = await processFile(abs, dryRun).catch((e) => {
      console.error('Falha:', abs, e.message || e)
      return { updatedSales: 0, skippedRow: 0, errors: 1, skippedFile: 1 }
    })
    total.updatedSales += s.updatedSales || 0
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

