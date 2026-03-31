/**
 * Importa clientes de planilha .xlsx exportada do sistema antigo (colunas tipo Revenda Mais / cadastro).
 *
 * Cabeçalhos esperados (1ª linha): cpf_cnpj, pessoa, sexo, nome, telefone_*, rg, data_nascimento,
 * data_cadastro, email, cep, rua, numero, bairro, estado, cidade, complemento, apelido, cargo,
 * grupos, nome_mae, nome_pai, data_ultima_compra, quantidade_veic_comprados, clie_cod, reve_cod
 *
 * Uso:
 *   node scripts/importClientesXlsx.js [--dry-run] [caminho/arquivo.xlsx]
 *
 * Caminho padrão (se omitido): services/recupererdoantigo/3c635772bf273f13d0644d77cedc1abc7546.xlsx
 *
 * Requer DATABASE_URL, prisma generate, dependência xlsx.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_REL = path.join('services', 'recupererdoantigo', '3c635772bf273f13d0644d77cedc1abc7546.xlsx')

function normName(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

function normPhoneKey(s) {
  return digitsOnly(s)
}

function formatCpfCnpj(d) {
  const x = String(d || '')
  if (x.length === 11) {
    return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9, 11)}`
  }
  if (x.length === 14) {
    return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12, 14)}`
  }
  return null
}

function parseDateBR(raw) {
  if (raw === undefined || raw === null) return null
  const t = String(raw).trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(
    parseInt(m[3], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[1], 10),
    12,
    0,
    0
  )
  return Number.isNaN(d.getTime()) ? null : d
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim()
    if (s && s !== '-') return s
  }
  return ''
}

function buildMarcador(row, grupos, cargo) {
  const parts = []
  const g = String(grupos || '').trim()
  if (g && !/nenhum grupo/i.test(g)) parts.push(g)
  const c = String(cargo || '').trim()
  if (c) parts.push(`Cargo: ${c}`)
  return parts.length ? parts.join(' | ') : null
}

function buildAdicionalMeta(row) {
  const bits = ['Importado XLSX']
  const clie = String(row.clie_cod ?? '').trim()
  const reve = String(row.reve_cod ?? '').trim()
  const du = String(row.data_ultima_compra ?? '').trim()
  const qv = String(row.quantidade_veic_comprados ?? '').trim()
  if (clie) bits.push(`clie_cod: ${clie}`)
  if (reve) bits.push(`reve_cod: ${reve}`)
  if (du) bits.push(`última compra: ${du}`)
  if (qv) bits.push(`qtd veículos: ${qv}`)
  return bits.join(' | ')
}

function buildAddress(row) {
  const rua = String(row.rua || '').trim()
  const num = String(row.numero || '').trim()
  const comp = String(row.complemento || '').trim()
  const bairro = String(row.bairro || '').trim()
  const parts = []
  if (rua) {
    let line = rua
    if (num && !line.includes(num)) line = `${line.replace(/,\s*$/, '')}, ${num}`
    parts.push(line)
  } else if (num) parts.push(num)
  if (comp) parts.push(comp)
  if (bairro) parts.push(bairro)
  return parts.length ? parts.join(' — ') : null
}

function normalizePessoa(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s.includes('jur')) return 'Jurídica'
  return 'Física'
}

function rowToObject(headers, arr) {
  const o = {}
  headers.forEach((h, i) => {
    const key = String(h || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
    o[key] = arr[i]
  })
  return o
}

async function loadIndexes() {
  const customers = await prisma.customer.findMany({
    select: { id: true, cpf: true, phone: true, name: true, adicional: true },
  })
  const byCpfDigits = new Map()
  const byClieCod = new Map()
  const byPhoneName = new Map()

  for (const c of customers) {
    const d = digitsOnly(c.cpf)
    if (d.length === 11 || d.length === 14) {
      if (!byCpfDigits.has(d)) byCpfDigits.set(d, c.id)
    }
    const ad = String(c.adicional || '')
    const m = ad.match(/clie_cod:\s*(\d+)/i)
    if (m && !byClieCod.has(m[1])) byClieCod.set(m[1], c.id)
    const pk = `${normName(c.name)}|${normPhoneKey(c.phone)}`
    if (!byPhoneName.has(pk)) byPhoneName.set(pk, c.id)
  }

  return { byCpfDigits, byClieCod, byPhoneName, customers }
}

function registerCustomerInMaps(maps, id, data) {
  const d = digitsOnly(data.cpf)
  if (d.length === 11 || d.length === 14) maps.byCpfDigits.set(d, id)
  const m = String(data.adicional || '').match(/clie_cod:\s*(\d+)/i)
  if (m) maps.byClieCod.set(m[1], id)
  const pk = `${normName(data.name)}|${normPhoneKey(data.phone)}`
  maps.byPhoneName.set(pk, id)
}

async function findExistingId(row, maps) {
  const cpfRaw = firstNonEmpty(row.cpf_cnpj, row.cpf)
  const dCpf = digitsOnly(cpfRaw)
  if (dCpf.length === 11 || dCpf.length === 14) {
    const id = maps.byCpfDigits.get(dCpf)
    if (id) return id
  }

  const clie = String(row.clie_cod ?? '').trim()
  if (clie) {
    const id = maps.byClieCod.get(clie)
    if (id) return id
  }

  const nome = String(row.nome || '').trim()
  const phone = firstNonEmpty(row.telefone_celular, row.telefone_residencial, row.telefone_comercial)
  const phoneFallback = phone || '—'
  const pk = `${normName(nome)}|${normPhoneKey(phoneFallback)}`
  return maps.byPhoneName.get(pk) || null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const fileArg = args.filter((a) => a !== '--dry-run').find((a) => !a.startsWith('--'))

  const abs = fileArg
    ? path.isAbsolute(fileArg)
      ? fileArg
      : path.resolve(process.cwd(), fileArg)
    : path.resolve(__dirname, '..', DEFAULT_REL)

  if (!fs.existsSync(abs)) {
    console.error('Arquivo não encontrado:', abs)
    process.exit(1)
  }

  const wb = XLSX.readFile(abs)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (!matrix.length) {
    console.error('Planilha vazia.')
    process.exit(1)
  }

  const headers = matrix[0].map((h) => String(h || '').trim())
  const stats = {
    sheet: sheetName,
    file: abs,
    rowsTotal: matrix.length - 1,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  }

  const maps = await loadIndexes()

  for (let i = 1; i < matrix.length; i++) {
    const arr = matrix[i]
    if (!arr || !arr.some((c) => String(c || '').trim())) {
      stats.skipped++
      continue
    }

    const row = rowToObject(headers, arr)
    const nome = String(row.nome || '').trim()
    if (!nome) {
      stats.skipped++
      continue
    }

    const telefone = firstNonEmpty(
      row.telefone_celular,
      row.telefone_residencial,
      row.telefone_comercial
    )
    const phone = telefone || '—'

    const cpfDigits = digitsOnly(row.cpf_cnpj || row.cpf)
    const cpfFormatted =
      cpfDigits.length === 11 || cpfDigits.length === 14 ? formatCpfCnpj(cpfDigits) : null

    const emailRaw = String(row.email || '').trim()
    const email = emailRaw || null

    const birthDate = parseDateBR(row.data_nascimento)
    const createdAtImport = parseDateBR(row.data_cadastro)

    const cidade = String(row.cidade || '').trim()
    const estado = String(row.estado || '').trim()
    const city =
      cidade && estado ? `${cidade} (${estado})` : cidade || estado || null

    const address = buildAddress(row)
    const cep = String(row.cep || '').trim() || null
    const district = String(row.bairro || '').trim() || null
    const rg = String(row.rg || '').trim() || null

    const pessoaType = normalizePessoa(row.pessoa)
    const apelido = String(row.apelido || '').trim() || null
    const sexo = String(row.sexo || '').trim() || null
    const nomeMae = String(row.nome_mae || '').trim() || null

    const marcador = buildMarcador(row, row.grupos, row.cargo)
    const adicional = buildAdicionalMeta(row)

    const profissao = String(row.cargo || '').trim() || null

    const data = {
      name: nome,
      phone,
      email,
      cpf: cpfFormatted,
      rg,
      address,
      cep,
      city,
      district,
      birthDate,
      pessoaType,
      apelido,
      marcador,
      nomeMae,
      sexo,
      profissao,
      adicional,
      status: 'novo',
    }

    try {
      const existingId = await findExistingId(row, maps)

      if (dryRun) {
        if (existingId) stats.updated++
        else stats.created++
        continue
      }

      if (existingId) {
        const prev = await prisma.customer.findUnique({ where: { id: existingId } })
        if (!prev) {
          stats.errors++
          continue
        }
        const patch = {}
        if (email && !prev.email) patch.email = email
        if (birthDate && !prev.birthDate) patch.birthDate = birthDate
        if (cpfFormatted && !prev.cpf) patch.cpf = cpfFormatted
        if (rg && !prev.rg) patch.rg = rg
        if (address && !prev.address) patch.address = address
        if (cep && !prev.cep) patch.cep = cep
        if (city && !prev.city) patch.city = city
        if (district && !prev.district) patch.district = district
        if (apelido && !prev.apelido) patch.apelido = apelido
        if (sexo && !prev.sexo) patch.sexo = sexo
        if (nomeMae && !prev.nomeMae) patch.nomeMae = nomeMae
        if (profissao && !prev.profissao) patch.profissao = profissao
        if (marcador) {
          patch.marcador = prev.marcador ? `${prev.marcador} | ${marcador}` : marcador
        }
        if (adicional) {
          patch.adicional = prev.adicional ? `${prev.adicional} | ${adicional}` : adicional
        }
        if (pessoaType && !prev.pessoaType) patch.pessoaType = pessoaType

        if (Object.keys(patch).length) {
          await prisma.customer.update({ where: { id: existingId }, data: patch })
        }
        stats.updated++
      } else {
        const createData = {
          ...data,
          ...(createdAtImport ? { createdAt: createdAtImport } : {}),
        }
        const created = await prisma.customer.create({ data: createData })
        stats.created++
        registerCustomerInMaps(maps, created.id, createData)
      }
    } catch (e) {
      stats.errors++
      console.warn(`Linha ${i + 1} (${nome}):`, e.message || e)
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
