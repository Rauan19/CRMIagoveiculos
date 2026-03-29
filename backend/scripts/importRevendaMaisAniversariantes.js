/**
 * Aniversariantes por Vendedor — atualiza birthDate / email / telefone em clientes já existentes (não cria venda).
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

function parseBirth(raw) {
  if (!raw) return null
  const t = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function pad10(row) {
  const v = Array.isArray(row) ? [...row] : []
  while (v.length < 10) v.push('')
  return v.slice(0, 10)
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  let stats = { updated: 0, skipped: 0, errors: 0 }

  for (let i = 0; i < rows.length; i++) {
    const vals = pad10(rows[i])
    const c0 = vals[0] || ''
    if (/^VENDEDOR:/i.test(c0)) continue
    if (c0 === 'Cliente' && vals[1] === 'Dt Nasc.') continue
    const name = String(c0).trim()
    if (!name) {
      stats.skipped++
      continue
    }

    const birthDate = parseBirth(vals[1])
    const email = String(vals[2] || '').trim() || null
    const cel = String(vals[3] || '').trim()
    const res = String(vals[4] || '').trim()
    const phone = cel || res || null
    const profissao = String(vals[9] || '').trim() || null

    const candidates = await prisma.customer.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    let customer = null
    if (candidates.length === 1) customer = candidates[0]
    else if (phone && candidates.length > 1) {
      customer = candidates.find((c) => c.phone === phone || c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
    }

    if (!customer) {
      stats.skipped++
      continue
    }

    const data = {}
    if (birthDate && (!customer.birthDate || customer.birthDate.getTime() !== birthDate.getTime())) {
      data.birthDate = birthDate
    }
    if (email && !customer.email) data.email = email
    if (phone && customer.phone === '—') data.phone = phone
    if (profissao && !customer.profissao) data.profissao = profissao

    if (Object.keys(data).length === 0) {
      stats.skipped++
      continue
    }

    if (dryRun) {
      stats.updated++
      continue
    }

    try {
      await prisma.customer.update({ where: { id: customer.id }, data })
      stats.updated++
    } catch (e) {
      stats.errors++
      console.warn(name, e.message)
    }
  }

  return stats
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisAniversariantes.js [--dry-run] <arquivo.XLS> [...]')
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
