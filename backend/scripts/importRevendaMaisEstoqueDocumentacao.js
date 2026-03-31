/**
 * Lista Gerencial de Estoque com Documentação — sem coluna Código; casa por placa.
 * Cria veículo disponível ou atualiza renavam/tipo se já existir (mesma placa).
 */
require('dotenv').config()
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { parseSpreadsheetPath, findRowIndex } = require('./lib/revendamaisXml')
const { findVehicleByPlateLoose } = require('./lib/vehiclePlateMatch')

const prisma = new PrismaClient()

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

function normalizeTipoToCanalEntrada(tipoRaw) {
  const t = String(tipoRaw || '')
    .trim()
    .toUpperCase()
  if (!t) return null
  if (t.includes('CONSIG')) return 'CONSIGNADO'
  if (t.includes('REPASSE')) return 'REPASSE'
  if (t.includes('PROPR')) return 'PRÓPRIO'
  return t.slice(0, 40)
}

function safeMoney(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseAno(s) {
  const parts = String(s || '')
    .split('/')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
  if (parts.length >= 2) return parts[1]
  if (parts.length === 1) return parts[0]
  return new Date().getFullYear()
}

function modelToBrandModel(full) {
  const s = String(full || '').trim() || '—'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { brand: s.slice(0, 80), model: '—' }
  return { brand: parts[0].slice(0, 80), model: parts.slice(1).join(' ').slice(0, 120) }
}

async function processFile(absPath, dryRun) {
  const rows = parseSpreadsheetPath(absPath)
  const headerIdx = findRowIndex(rows, (v) => String(v[1] || '').trim() === 'Pos.' && String(v[2] || '').trim() === 'Modelo' && String(v[5] || '').trim() === 'Placa')
  if (headerIdx === -1) {
    console.warn('[SKIP] Cabeçalho Estoque com Documentação não reconhecido:', absPath)
    return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  }

  const stats = { imported: 0, updated: 0, skippedRow: 0, errors: 0 }
  const base = path.basename(absPath)
  const header = rows[headerIdx] || []
  const norm = header.map((x) => String(x || '').trim().toLowerCase())
  const idxOf = (pred) => {
    for (let i = 0; i < norm.length; i++) if (pred(norm[i])) return i
    return -1
  }
  const IDX = {
    pos: idxOf((s) => s === 'pos.'),
    modelo: idxOf((s) => s === 'modelo'),
    ano: idxOf((s) => s === 'ano'),
    cor: idxOf((s) => s === 'cor'),
    placa: idxOf((s) => s === 'placa'),
    renavam: idxOf((s) => s === 'renavam'),
    situacao: idxOf((s) => s === 'situação' || s === 'situacao'),
    tipo: idxOf((s) => s === 'tipo'),
    ipva: idxOf((s) => s === 'ipva'),
    vlrOferta: idxOf((s) => s.includes('vlr') && s.includes('oferta')),
    recibo: idxOf((s) => s === 'recibo'),
    vencIpva: idxOf((s) => s.includes('venc') && s.includes('ipva')),
    licSeg: idxOf((s) => s.includes('lic') && s.includes('seg')),
    vendedor: idxOf((s) => s === 'vendedor'),
    localizacao: idxOf((s) => s.includes('localiza')),
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]
    const modelo = String(v[IDX.modelo] || '').trim()
    const plateRaw = String(v[IDX.placa] || '').trim()
    if (!modelo || !plateRaw || plateRaw === '-') {
      stats.skippedRow++
      continue
    }

    const { brand, model } = modelToBrandModel(modelo)
    const year = parseAno(v[IDX.ano])
    const color = String(v[IDX.cor] || '').trim() || null
    const renavamRaw = String(v[IDX.renavam] || '').trim()
    const renavam = /^\d{5,}$/.test(renavamRaw) ? renavamRaw.slice(0, 20) : null
    const situacao = String(v[IDX.situacao] || '').trim() || null
    const tipo = String(v[IDX.tipo] || '').trim() || null
    const ipva = safeMoney(v[IDX.ipva])
    const vlrOferta = safeMoney(v[IDX.vlrOferta])
    const recibo = String(v[IDX.recibo] || '').trim() || null
    const vencIpva = parsePtBrDate(v[IDX.vencIpva])
    const licSeg = safeMoney(v[IDX.licSeg])
    const vendedor = String(v[IDX.vendedor] || '').trim() || null
    const localizacao = String(v[IDX.localizacao] || '').trim() || null

    const existing = await findVehicleByPlateLoose(prisma, plateRaw)
    const tag = `RM-DOC:${base}`

    if (dryRun) {
      stats.imported++
      continue
    }

    try {
      if (existing) {
        const cur = await prisma.vehicle.findUnique({
          where: { id: existing.id },
          select: {
            notes: true,
            renavam: true,
            canalEntrada: true,
            situacaoRecibo: true,
            vencimentoIPVA: true,
            valorLicencSeg: true,
            valorIPVA: true,
            vendedorAngariador: true,
            price: true,
          },
        })
        const nextNotes = cur?.notes?.includes('RM-DOC:')
          ? cur.notes
          : [cur?.notes, tipo ? `Tipo(doc): ${tipo}` : null, tag].filter(Boolean).join(' | ')
        await prisma.$transaction(async (tx) => {
          await tx.vehicle.update({
            where: { id: existing.id },
            data: {
              ...(renavam && !cur?.renavam ? { renavam } : {}),
              ...(vlrOferta != null && (cur?.price == null || cur.price === 0) ? { price: vlrOferta } : {}),
              ...(ipva != null && cur?.valorIPVA == null ? { valorIPVA: ipva } : {}),
              ...(licSeg != null && cur?.valorLicencSeg == null ? { valorLicencSeg: licSeg } : {}),
              ...(vencIpva && !cur?.vencimentoIPVA ? { vencimentoIPVA: vencIpva } : {}),
              ...(recibo && !cur?.situacaoRecibo ? { situacaoRecibo: recibo } : {}),
              ...(vendedor && !cur?.vendedorAngariador ? { vendedorAngariador: vendedor } : {}),
              ...(tipo && !cur?.canalEntrada ? { canalEntrada: normalizeTipoToCanalEntrada(tipo) } : {}),
              notes: nextNotes.slice(0, 4000),
            },
          })

          if (localizacao) {
            await tx.location.create({
              data: {
                vehicleId: existing.id,
                location: localizacao.slice(0, 200),
                notes: [tag, situacao ? `Situação(doc): ${situacao}` : null].filter(Boolean).join(' | ').slice(0, 500),
              },
            })
          }
        })
        stats.updated++
        continue
      }

      await prisma.vehicle.create({
        data: {
          brand,
          model,
          year,
          color,
          plate: plateRaw.slice(0, 20),
          renavam,
          status: 'disponivel',
          canalEntrada: normalizeTipoToCanalEntrada(tipo),
          situacaoRecibo: recibo,
          vencimentoIPVA: vencIpva,
          valorLicencSeg: licSeg,
          valorIPVA: ipva,
          vendedorAngariador: vendedor,
          price: vlrOferta,
          notes: `${tag} | placa import doc`,
          locations: localizacao
            ? {
                create: {
                  location: localizacao.slice(0, 200),
                  notes: [tag, situacao ? `Situação(doc): ${situacao}` : null].filter(Boolean).join(' | ').slice(0, 500),
                },
              }
            : undefined,
        },
      })
      stats.imported++
    } catch (e) {
      stats.errors++
      console.warn(`Erro placa ${plateRaw}:`, e.message || e)
    }
  }

  return { skippedFile: 0, ...stats }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
  const dryRun = process.argv.includes('--dry-run')
  if (!args.length) {
    console.error('Uso: node scripts/importRevendaMaisEstoqueDocumentacao.js [--dry-run] <arquivo.XLS> [...]')
    process.exit(1)
  }
  let t = { imported: 0, updated: 0, skippedRow: 0, errors: 0, skippedFile: 0 }
  for (const fileArg of args) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
    const s = await processFile(abs, dryRun).catch((e) => {
      console.error(abs, e.message)
      return { skippedFile: 1, imported: 0, updated: 0, skippedRow: 0, errors: 0 }
    })
    Object.keys(t).forEach((k) => (t[k] += s[k] || 0))
  }
  console.log(dryRun ? 'Dry-run:' : 'OK:', JSON.stringify(t, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
