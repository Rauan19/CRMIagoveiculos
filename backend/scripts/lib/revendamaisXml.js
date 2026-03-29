/**
 * Leitura de planilhas Excel no formato XML Spreadsheet (.XLS) exportadas pelo Revenda Mais.
 */
const fs = require('fs')
const { XMLParser } = require('fast-xml-parser')

function cellValue(cell) {
  if (!cell || cell.Data === undefined || cell.Data === null) return ''
  const d = cell.Data
  if (typeof d === 'string') return d
  if (typeof d === 'number') return String(d)
  if (d['#text'] !== undefined) return String(d['#text'])
  return ''
}

function rowToValues(row) {
  const cells = row.Cell
  const arr = Array.isArray(cells) ? cells : cells ? [cells] : []
  const out = []
  let col = 0
  for (const c of arr) {
    const idxAttr = c['@_ss:Index']
    const idx = idxAttr ? parseInt(idxAttr, 10) - 1 : col
    while (out.length < idx) out.push('')
    out[idx] = cellValue(c)
    col = idx + 1
  }
  return out
}

function parseSpreadsheetPath(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  })
  const doc = parser.parse(xml)
  const table = doc?.Workbook?.Worksheet?.['ss:Table']
  if (!table?.Row) {
    throw new Error('Planilha inválida ou sem ss:Table/Row (verifique se é XML Spreadsheet .XLS do Revenda Mais)')
  }
  const rows = Array.isArray(table.Row) ? table.Row : [table.Row]
  return rows.map(rowToValues)
}

function findRowIndex(rows, predicate) {
  for (let i = 0; i < rows.length; i++) {
    if (predicate(rows[i], i)) return i
  }
  return -1
}

/** Primeiros bytes do arquivo (XML Spreadsheet) — suficiente para achar <Title>. */
function readSpreadsheetTitle(filePath) {
  const buf = fs.readFileSync(filePath)
  const head = buf.slice(0, Math.min(buf.length, 32000)).toString('utf8')
  const m = head.match(/<Title>([^<]*)<\/Title>/)
  return m ? String(m[1]).trim() : ''
}

/** Remove acentos e minúsculas — comparação estável com títulos do Revenda Mais. */
function normalizeAscii(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Placa para comparação (ignora hífen/espaço). */
function normalizePlate(s) {
  return String(s || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

module.exports = {
  cellValue,
  rowToValues,
  parseSpreadsheetPath,
  findRowIndex,
  readSpreadsheetTitle,
  normalizeAscii,
  normalizePlate,
}
