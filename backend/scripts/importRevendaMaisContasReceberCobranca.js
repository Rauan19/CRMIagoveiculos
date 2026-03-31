/**
 * Importa "Contas a Receber Cobrança" (Revenda Mais, .XLS XML) para FinancialTransaction.
 *
 * O arquivo vem em blocos por "Data de Venc:" com cabeçalho repetido.
 * Cabeçalho típico:
 *  Data Venc., Nº Doc, DRE, Baixado, Conciliado, Pos, Fornecedor, Residencial, Celular, Descrição,
 *  Conta bancária, Multas, Juros, Descontos, Valor
 *
 * Idempotência: preferir revendaMaisId quando existir (Nº Doc/ID); fallback por importRowHash.
 *
 * Uso:
 *   node scripts/importRevendaMaisContasReceberCobranca.js [--dry-run] <arquivo.XLS> [...]
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

async function ensureCustomerIdByNamePhone(nameRaw, phoneRaw) {
  const name = String(nameRaw || '').trim()
  const phone = String(phoneRaw || '').trim()
  if (!name) return null
  const existing = await prisma.customer.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(phone ? { phone } : {}),
    },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.customer.create({
    data: { name, phone: phone || '—', pessoaType: 'Física', status: 'novo', marcador: 'Import financeiro (Cobrança Revenda Mais)' },
    select: { id: true },
  })
  return created.id
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  // Cabeçalho aparece várias vezes; detectar o primeiro.
  const headerIdx = findRowIndex(rows, (v) => {
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    return blob.includes('data venc') && blob.includes('fornecedor') && blob.includes('descricao') && blob.includes('valor')
  })
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Contas a Receber Cobrança):', absPath)
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
    dataVenc: idxOf((s) => s.includes('data') && s.includes('venc')),
    numDoc: idxOf((s) => s.includes('n') && s.includes('doc')),
    baixado: idxOf((s) => s.includes('baixad')),
    pos: idxOf((s) => s === 'pos'),
    fornecedor: idxOf((s) => s === 'fornecedor'),
    residencial: idxOf((s) => s.includes('resid')),
    celular: idxOf((s) => s.includes('celular')),
    descricao: idxOf((s) => s.includes('descric')),
    valor: idxOf((s) => s === 'valor'),
    juros: idxOf((s) => s === 'juros'),
    multas: idxOf((s) => s.includes('mult')),
    descontos: idxOf((s) => s.includes('descont')),
  }

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]
    const first = normalizeAscii(String(v[0] || '').trim())
    if (!v || !v.length) continue
    if (first.startsWith('data de venc')) {
      stats.skippedRow++
      continue
    }
    // pular cabeçalhos repetidos e totais
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    if (blob.includes('data venc') && blob.includes('fornecedor') && blob.includes('descricao')) {
      stats.skippedRow++
      continue
    }
    if (first.startsWith('total')) {
      stats.skippedRow++
      continue
    }

    const due = parseDate(v[IDX.dataVenc])
    const fornecedor = String(v[IDX.fornecedor] || '').trim()
    const descricao = String(v[IDX.descricao] || '').trim()
    const amount = safeMoney(v[IDX.valor])
    if (!due || !fornecedor || amount == null) {
      stats.skippedRow++
      continue
    }
    const baixado = normalizeAscii(String(v[IDX.baixado] || '')) === 'sim'
    const phone = String(v[IDX.celular] || v[IDX.residencial] || '').trim()
    const rmId = String(v[IDX.numDoc] || '').trim()
    const rowHash = sha1(`rm:cr-cobranca:${base}:${rmId || due.toISOString().slice(0, 10)}:${fornecedor}:${descricao}:${amount}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const customerId = await ensureCustomerIdByNamePhone(fornecedor, phone)
      const data = {
        operacao: 'receber',
        type: 'receber',
        revendaMaisId: rmId || null,
        description: descricao || `CR Cobrança ${fornecedor}`,
        numeroDocumento: rmId || null,
        dataVencimento: due,
        dueDate: due,
        valorTitulo: amount,
        amount: amount,
        customerId,
        posicaoEstoque: v[IDX.pos] != null && String(v[IDX.pos]).trim() ? parseInt(String(v[IDX.pos]).trim(), 10) : null,
        observacoes: [
          safeMoney(v[IDX.multas]) ? `Multas: ${safeMoney(v[IDX.multas])}` : null,
          safeMoney(v[IDX.juros]) ? `Juros: ${safeMoney(v[IDX.juros])}` : null,
          safeMoney(v[IDX.descontos]) ? `Descontos: ${safeMoney(v[IDX.descontos])}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || null,
        status: baixado ? 'pago' : 'pendente',
        paidDate: baixado ? due : null,
        importSourceFile: base,
        importRowHash: rowHash,
      }

      if (rmId) {
        await prisma.financialTransaction.upsert({
          where: { operacao_revendaMaisId: { operacao: 'receber', revendaMaisId: rmId } },
          update: {
            customerId: data.customerId || undefined,
            description: data.description,
            dataVencimento: data.dataVencimento || undefined,
            valorTitulo: data.valorTitulo ?? undefined,
            posicaoEstoque: data.posicaoEstoque ?? undefined,
            observacoes: data.observacoes || undefined,
            status: data.status,
            paidDate: data.paidDate || undefined,
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
            data: {
              revendaMaisId: rmId || undefined,
              status: baixado ? 'pago' : 'pendente',
              paidDate: baixado ? due : null,
              importSourceFile: base,
            },
          })
          stats.updated++
        } catch {
          stats.updated++
        }
      } else {
        stats.errors++
        console.warn('Erro (CR cobrança):', base, 'linha', i, e.message || e)
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
    console.error('Uso: node scripts/importRevendaMaisContasReceberCobranca.js [--dry-run] <arquivo.XLS> [...]')
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

