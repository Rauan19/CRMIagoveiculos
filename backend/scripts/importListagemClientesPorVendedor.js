/**
 * Importa planilha "Listagem de Clientes por Vendedor" (Excel XML Spreadsheet, extensão .XLS).
 *
 * Uso:
 *   node scripts/importListagemClientesPorVendedor.js "C:\\caminho\\arquivo.XLS"
 *   node scripts/importListagemClientesPorVendedor.js --dry-run "C:\\caminho\\arquivo.XLS"
 *
 * Variáveis .env (opcional):
 *   IMPORT_DEFAULT_SELLER_ID=1   → User.id usado quando o nome do vendedor da planilha não bate com nenhum User
 *
 * Requer DATABASE_URL e prisma generate.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath } = require('./lib/revendamaisXml')

const prisma = new PrismaClient()

function normName(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function pad10(vals) {
  const v = Array.isArray(vals) ? [...vals] : []
  while (v.length < 10) v.push('')
  return v.slice(0, 10)
}

function parseBirth(raw) {
  if (!raw) return null
  const t = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function parseSaleDate(raw) {
  if (!raw) return new Date()
  const t = String(raw).trim()
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  return new Date()
}

function parseVehicle(vehicleStr) {
  const s = String(vehicleStr || '').trim()
  if (!s) {
    return { brand: '—', model: '—', year: new Date().getFullYear() }
  }
  const parts = s.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) {
    return { brand: s.slice(0, 80), model: '—', year: new Date().getFullYear() }
  }
  const last = parts[parts.length - 1]
  const y = parseInt(last, 10)
  if (Number.isFinite(y) && y >= 1950 && y <= 2035) {
    return {
      brand: parts[0].slice(0, 80),
      model: (parts.slice(1, -1).join(' - ') || parts[1] || '—').slice(0, 120),
      year: y,
    }
  }
  return {
    brand: parts[0].slice(0, 80),
    model: parts.slice(1).join(' - ').slice(0, 120),
    year: new Date().getFullYear(),
  }
}

function parseKm(raw) {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (!s || s === '-' || /^0+$/.test(s.replace(/\D/g, ''))) return null
  const n = parseInt(s.replace(/\./g, '').replace(/,/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function cleanPlate(p) {
  const s = String(p || '').trim()
  if (!s || s === '-') return null
  return s.slice(0, 20)
}

function sellerNameFromBanner(text) {
  return String(text || '')
    .replace(/^VENDEDOR:\s*/i, '')
    .trim()
}

function findSellerId(vendedorBanner, users, defaultSellerId) {
  const raw = sellerNameFromBanner(vendedorBanner)
  const n = normName(raw)
  if (!n) return defaultSellerId || null

  const hit = users.find((u) => {
    const un = normName(u.name)
    return un === n || un.includes(n) || n.includes(un)
  })
  if (hit) return hit.id
  return defaultSellerId || null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const fileArg = args.filter((a) => a !== '--dry-run')[0]
  if (!fileArg) {
    console.error('Informe o caminho do arquivo .XLS, ex: node scripts/importListagemClientesPorVendedor.js "C:\\...\\arquivo.XLS"')
    process.exit(1)
  }
  const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(abs)) {
    console.error('Arquivo não encontrado:', abs)
    process.exit(1)
  }

  const defaultSellerId = process.env.IMPORT_DEFAULT_SELLER_ID
    ? parseInt(process.env.IMPORT_DEFAULT_SELLER_ID, 10)
    : null

  let rows
  try {
    rows = parseSpreadsheetPath(abs)
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  if (!defaultSellerId && users.length === 0) {
    console.error('Não há usuários no banco. Cadastre ao menos um vendedor ou defina IMPORT_DEFAULT_SELLER_ID.')
    process.exit(1)
  }

  let currentVendedorBanner = ''
  const stats = {
    rowsData: 0,
    customersCreated: 0,
    customersReused: 0,
    vehiclesCreated: 0,
    salesCreated: 0,
    skipped: 0,
    errors: 0,
  }

  for (let i = 0; i < rows.length; i++) {
    const vals = pad10(rows[i])
    const c0 = vals[0] || ''

    if (/^VENDEDOR:/i.test(c0)) {
      currentVendedorBanner = c0
      continue
    }
    if (c0 === 'Cliente' && vals[1] === 'Dt Nasc.') {
      continue
    }
    if (!c0.trim()) {
      stats.skipped++
      continue
    }

    const [
      name,
      birthRaw,
      emailRaw,
      celular,
      residencial,
      saleDateRaw,
      veiculoStr,
      plateRaw,
      kmRaw,
      profissao,
    ] = vals

    const phone = String(celular || '').trim() || String(residencial || '').trim() || '—'
    const email = String(emailRaw || '').trim() || null
    const birthDate = parseBirth(birthRaw)
    const saleDate = parseSaleDate(saleDateRaw)
    const { brand, model, year } = parseVehicle(veiculoStr)
    const plate = cleanPlate(plateRaw)
    const km = parseKm(kmRaw)

    const sellerId = findSellerId(currentVendedorBanner, users, defaultSellerId || users[0]?.id)
    if (!sellerId) {
      console.warn(`Linha ~${i + 1}: sem vendedor resolvido para "${name}" — defina IMPORT_DEFAULT_SELLER_ID`)
      stats.errors++
      continue
    }

    stats.rowsData++

    if (dryRun) {
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        const trimmedName = name.trim()
        let customer = await tx.customer.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' },
            phone,
          },
        })
        if (!customer && phone !== '—') {
          const byPhone = await tx.customer.findFirst({ where: { phone } })
          if (byPhone && normName(byPhone.name) === normName(trimmedName)) {
            customer = byPhone
          }
        }

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: trimmedName,
              phone,
              email,
              birthDate,
              profissao: String(profissao || '').trim() || null,
              marcador: sellerNameFromBanner(currentVendedorBanner)
                ? `Vendedor: ${sellerNameFromBanner(currentVendedorBanner)}`
                : null,
              status: 'novo',
            },
          })
          stats.customersCreated++
        } else {
          stats.customersReused++
          const patch = {}
          if (email && !customer.email) patch.email = email
          if (birthDate && !customer.birthDate) patch.birthDate = birthDate
          if (profissao && !customer.profissao) patch.profissao = String(profissao).trim()
          const marc = sellerNameFromBanner(currentVendedorBanner)
          if (marc && (!customer.marcador || !String(customer.marcador).includes(marc))) {
            patch.marcador = customer.marcador
              ? `${customer.marcador} | Vendedor: ${marc}`
              : `Vendedor: ${marc}`
          }
          if (Object.keys(patch).length) {
            await tx.customer.update({ where: { id: customer.id }, data: patch })
          }
        }

        const vehicle = await tx.vehicle.create({
          data: {
            brand,
            model,
            year,
            plate,
            km,
            customerId: customer.id,
            status: 'vendido',
          },
        })
        stats.vehiclesCreated++

        await tx.sale.create({
          data: {
            customerId: customer.id,
            vehicleId: vehicle.id,
            sellerId,
            salePrice: null,
            status: 'concluida',
            date: saleDate,
            notes: 'Importado de planilha Listagem de Clientes por Vendedor',
          },
        })
        stats.salesCreated++
      })
    } catch (e) {
      stats.errors++
      console.warn(`Erro linha ~${i + 1} (${name}):`, e.message || e)
    }
  }

  console.log(dryRun ? 'DRY-RUN (nada gravado):' : 'Importação concluída:')
  console.log(JSON.stringify(stats, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
