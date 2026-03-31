/**
 * Importa "Contas a Receber Lista" (Revenda Mais, .XLS XML) para FinancialTransaction.
 *
 * Cabeçalho típico:
 *  Data, Dt. Emissão, ID, Bx Agrup., Nº Doc, Mês Ref, DRE, Baixado, Conciliado, Posição, Categoria, Banco, Conta,
 *  Placa, Veic. Venda, Descrição, Fornecedor, Forma pgto, Valor
 *
 * Idempotência: FinancialTransaction.importRowHash (sourceFile + ID).
 *
 * Uso:
 *   node scripts/importRevendaMaisContasReceberLista.js [--dry-run] <arquivo.XLS> [...]
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
    data: { name, phone: '—', pessoaType: 'Física', status: 'novo', marcador: 'Import financeiro (Revenda Mais)' },
    select: { id: true },
  })
  return created.id
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => {
    const blob = normalizeAscii(v.filter(Boolean).join(' '))
    return blob.includes('dt. emiss') && blob.includes('id') && blob.includes('fornecedor') && blob.includes('valor')
  })
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho não reconhecido (Contas a Receber Lista):', absPath)
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
    dtEmissao: idxOf((s) => s.includes('emiss')),
    id: idxOf((s) => s === 'id'),
    numDoc: idxOf((s) => s.includes('n') && s.includes('doc')),
    mesRef: idxOf((s) => s.includes('mes') && s.includes('ref')),
    dre: idxOf((s) => s === 'dre'),
    baixado: idxOf((s) => s.includes('baixad')),
    conciliado: idxOf((s) => s.includes('concil')),
    posicao: idxOf((s) => s.includes('posic')),
    categoria: idxOf((s) => s.includes('categori')),
    banco: idxOf((s) => s === 'banco'),
    conta: idxOf((s) => s === 'conta'),
    placa: idxOf((s) => s === 'placa'),
    veicVenda: idxOf((s) => s.includes('veic') && s.includes('venda')),
    descricao: idxOf((s) => s.includes('descric')),
    fornecedor: idxOf((s) => s === 'fornecedor'),
    formaPgto: idxOf((s) => s.includes('forma') && s.includes('pgto')),
    valor: idxOf((s) => s === 'valor'),
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const id = String(v[IDX.id] || '').trim()
    if (!id || id.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('pagina')) {
      stats.skippedRow++
      continue
    }

    const due = parseDate(v[IDX.data])
    const issue = parseDate(v[IDX.dtEmissao])
    const amount = safeMoney(v[IDX.valor])
    const fornecedor = String(v[IDX.fornecedor] || '').trim()
    const descricao = String(v[IDX.descricao] || '').trim()
    const categoria = String(v[IDX.categoria] || '').trim()
    const forma = String(v[IDX.formaPgto] || '').trim()
    const baixado = normalizeAscii(String(v[IDX.baixado] || '')) === 'sim'

    const rowHash = sha1(`rm:cr-lista:${base}:${id}`)

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      const customerId = fornecedor ? await ensureCustomerIdByName(fornecedor) : null
      const data = {
        operacao: 'receber',
        type: 'receber',
        revendaMaisId: id || null,
        description: descricao || categoria || `CR ${id}`,
        observacoes: [categoria ? `Categoria: ${categoria}` : null, forma ? `Forma: ${forma}` : null].filter(Boolean).join(' | ') || null,
        numeroDocumento: String(v[IDX.numDoc] || '').trim() || id,
        dataVencimento: due,
        dueDate: due,
        valorTitulo: amount,
        amount: amount,
        customerId,
        mesReferencia: String(v[IDX.mesRef] || '').trim() || null,
        posicaoEstoque: v[IDX.posicao] != null && String(v[IDX.posicao]).trim() ? parseInt(String(v[IDX.posicao]).trim(), 10) : null,
        formaPagamento: forma || null,
        status: baixado ? 'pago' : 'pendente',
        paidDate: baixado ? due : null,
        marcador: String(v[IDX.placa] || '').trim() || null,
        importSourceFile: base,
        importRowHash: rowHash,
        createdAt: issue || undefined,
      }

      // Upsert por (operacao + revendaMaisId) quando possível; caso contrário cria pelo rowHash.
      if (id) {
        await prisma.financialTransaction.upsert({
          where: { operacao_revendaMaisId: { operacao: 'receber', revendaMaisId: id } },
          update: {
            // preenche/atualiza campos relevantes sem apagar o que já existe
            customerId: data.customerId || undefined,
            description: data.description,
            observacoes: data.observacoes || undefined,
            numeroDocumento: data.numeroDocumento || undefined,
            dataVencimento: data.dataVencimento || undefined,
            valorTitulo: data.valorTitulo ?? undefined,
            mesReferencia: data.mesReferencia || undefined,
            posicaoEstoque: data.posicaoEstoque ?? undefined,
            formaPagamento: data.formaPagamento || undefined,
            status: data.status,
            paidDate: data.paidDate || undefined,
            marcador: data.marcador || undefined,
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
        // fallback: se já existe pelo importRowHash, tentar atualizar campos principais
        try {
          await prisma.financialTransaction.update({
            where: { importRowHash: rowHash },
            data: {
              revendaMaisId: id || undefined,
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
        console.warn('Erro (CR lista):', base, 'linha', i, e.message || e)
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
    console.error('Uso: node scripts/importRevendaMaisContasReceberLista.js [--dry-run] <arquivo.XLS> [...]')
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

