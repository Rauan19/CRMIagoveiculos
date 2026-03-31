/**
 * Importa "Contas a Pagar Entrada de Veículo" (Revenda Mais, .XLS XML) para FinancialTransaction.
 *
 * Cabeçalho:
 *  Data, ID, Nº Doc, Descrição, Fornecedor, Valor
 *
 * Idempotência: FinancialTransaction.importRowHash (sourceFile + ID).
 *
 * Uso:
 *   node scripts/importRevendaMaisContasPagarEntradaVeiculo.js [--dry-run] <arquivo.XLS> [...]
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

async function ensureCustomerIdByName(nameRaw) {
  const name = String(nameRaw || '').trim()
  if (!name) return null
  const existing = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.customer.create({
    data: { name, phone: '—', pessoaType: 'Física', status: 'novo', marcador: 'Import financeiro (CP Revenda Mais)' },
    select: { id: true },
  })
  return created.id
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => {
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    return blob === 'data id n doc descricao fornecedor valor' || (blob.includes('fornecedor') && blob.includes('descricao') && blob.includes('valor') && blob.includes('id'))
  })
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Contas a Pagar Entrada de Veículo):', absPath)
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
    data: idxOf((s) => s === 'data'),
    id: idxOf((s) => s === 'id'),
    numDoc: idxOf((s) => s.includes('doc')),
    descricao: idxOf((s) => s.includes('descric')),
    fornecedor: idxOf((s) => s === 'fornecedor'),
    valor: idxOf((s) => s === 'valor'),
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const id = String(v[IDX.id] || '').trim()
    const first = normalizeAscii(String(v[0] || '').trim())
    if (!id || first.startsWith('total')) {
      stats.skippedRow++
      continue
    }
    const due = parseDate(v[IDX.data])
    const amount = safeMoney(v[IDX.valor])
    const fornecedor = String(v[IDX.fornecedor] || '').trim()
    const descricao = String(v[IDX.descricao] || '').trim()
    const numDoc = String(v[IDX.numDoc] || '').trim()

    const rowHash = sha1(`rm:cp-entrada:${base}:${id}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const customerId = fornecedor ? await ensureCustomerIdByName(fornecedor) : null
      const data = {
        operacao: 'pagar',
        type: 'pagar',
        revendaMaisId: id || null,
        description: descricao || `CP Entrada ${id}`,
        numeroDocumento: numDoc || id,
        dataVencimento: due,
        dueDate: due,
        valorTitulo: amount,
        amount: amount,
        customerId,
        status: 'pendente',
        importSourceFile: base,
        importRowHash: rowHash,
      }

      if (id) {
        await prisma.financialTransaction.upsert({
          where: { operacao_revendaMaisId: { operacao: 'pagar', revendaMaisId: id } },
          update: {
            customerId: data.customerId || undefined,
            description: data.description,
            numeroDocumento: data.numeroDocumento || undefined,
            dataVencimento: data.dataVencimento || undefined,
            valorTitulo: data.valorTitulo ?? undefined,
            status: 'pendente',
            importSourceFile: base,
          },
          create: data,
        })
      } else {
        await prisma.financialTransaction.create({ data })
      }
      stats.imported++
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('Unique constraint failed') || msg.includes('unique constraint')) {
        try {
          await prisma.financialTransaction.update({
            where: { importRowHash: rowHash },
            data: { revendaMaisId: id || undefined, importSourceFile: base },
          })
          stats.updated++
        } catch {
          stats.updated++
        }
      } else {
        stats.errors++
        console.warn('Erro (CP entrada):', base, 'linha', i, e.message || e)
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
    console.error('Uso: node scripts/importRevendaMaisContasPagarEntradaVeiculo.js [--dry-run] <arquivo.XLS> [...]')
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

