/**
 * Varre uma pasta de .XLS (Revenda Mais), classifica pelo <Title> e roda importadores na ordem certa.
 *
 * Ordem: clientes → vendas (com cliente → dados venda) → estoque → estoque doc → FIPE → valor mínimo → canal → aniversariantes
 *
 * Pasta padrão: services/recupererdoantigo (se existir); senão ../../imports/revendamais
 *
 * Uso:
 *   node scripts/importRevendaMaisBatch.js --list-only [--dir "C:\\pasta"]
 *   node scripts/importRevendaMaisBatch.js [--dry-run] [--dir "C:\\pasta"]
 *
 * --dry-run repassa para cada script (simula gravações).
 */
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const { readSpreadsheetTitle, normalizeAscii } = require('./lib/revendamaisXml')

const SCRIPTS = {
  'clientes-vendedor': 'importListagemClientesPorVendedor.js',
  'vendidos-cliente': 'importRevendaMaisVendidosComCliente.js',
  'vendidos-dados': 'importRevendaMaisVendidosDadosVenda.js',
  estoque: 'importRevendaMaisEstoqueGerencial.js',
  'estoque-doc': 'importRevendaMaisEstoqueDocumentacao.js',
  fipe: 'importRevendaMaisEnriquecerFipe.js',
  'valor-minimo': 'importRevendaMaisEnriquecerValorMinimo.js',
  'canal-venda': 'importRevendaMaisCanalVenda.js',
  aniversariantes: 'importRevendaMaisAniversariantes.js',
}

const PHASE = {
  'clientes-vendedor': 10,
  'vendidos-cliente': 20,
  'vendidos-dados': 30,
  estoque: 40,
  'estoque-doc': 50,
  fipe: 60,
  'valor-minimo': 70,
  'canal-venda': 80,
  aniversariantes: 90,
}

function classifyFile(absPath) {
  const title = readSpreadsheetTitle(absPath)
  const base = path.basename(absPath, path.extname(absPath))
  const blob = normalizeAscii(title || base)

  const pending = (reason) => ({ kind: 'skip', label: title || base, script: null, reason })

  if (!blob) return { kind: 'unknown', label: '(sem título)', script: null }

  if (blob.includes('dados da venda') && blob.includes('vendidos')) {
    return { kind: 'vendidos-dados', label: title || base, script: SCRIPTS['vendidos-dados'] }
  }
  if (blob.includes('com cliente') && blob.includes('vendidos')) {
    return { kind: 'vendidos-cliente', label: title || base, script: SCRIPTS['vendidos-cliente'] }
  }
  if (blob.includes('listagem de clientes por vendedor')) {
    return { kind: 'clientes-vendedor', label: title || base, script: SCRIPTS['clientes-vendedor'] }
  }
  if (blob.includes('lista gerencial de estoque')) {
    if (blob.includes('document')) {
      return { kind: 'estoque-doc', label: title || base, script: SCRIPTS['estoque-doc'] }
    }
    return { kind: 'estoque', label: title || base, script: SCRIPTS.estoque }
  }
  if (blob.includes('fipe') && blob.includes('estoque')) {
    return { kind: 'fipe', label: title || base, script: SCRIPTS.fipe }
  }
  if (blob.includes('valor minimo') || blob.includes('valor mínimo')) {
    return { kind: 'valor-minimo', label: title || base, script: SCRIPTS['valor-minimo'] }
  }
  if (blob.includes('canal de venda')) {
    return { kind: 'canal-venda', label: title || base, script: SCRIPTS['canal-venda'] }
  }
  if (blob.includes('aniversariantes')) {
    return { kind: 'aniversariantes', label: title || base, script: SCRIPTS.aniversariantes }
  }

  if (blob.includes('vendas mensais')) return pending('Resumo mensal — não importa linha a linha')
  if (blob.includes('impostos') && blob.includes('vendidos')) return pending('Impostos — sem importador')
  if (blob.includes('comparativo') && blob.includes('financeir')) return pending('Comparativo — resumo')
  if (blob.includes('contas a pagar') && blob.includes('entrada')) return pending('Contas entrada veículo — vazio ou layout próprio')
  if (blob.includes('retorno de financiamento')) return pending('Retorno financiamento — sem parser neste lote')
  if (blob.includes('estoque por marcas')) return pending('Estoque por marcas — agregado')

  return { kind: 'unknown', label: title || base, script: null, reason: 'Não mapeado' }
}

function listXls(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.xls$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort()
}

function defaultImportDir() {
  const r = path.resolve(__dirname, '../services/recupererdoantigo')
  if (fs.existsSync(r)) return r
  return path.resolve(__dirname, '../../imports/revendamais')
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const listOnly = argv.includes('--list-only')
  const dirIdx = argv.indexOf('--dir')
  const customDir = dirIdx >= 0 && argv[dirIdx + 1] ? argv[dirIdx + 1] : null
  const dir = customDir ? path.resolve(customDir) : defaultImportDir()

  const files = listXls(dir)
  if (files.length === 0) {
    console.log(`Nenhum .XLS em: ${dir}`)
    process.exit(0)
  }

  const node = process.execPath
  const scriptsDir = __dirname

  const run = []
  const skip = []
  const unknown = []

  for (const abs of files) {
    const info = classifyFile(abs)
    const name = path.basename(abs)
    const row = { abs, name, ...info }
    if (info.script) run.push(row)
    else if (info.kind === 'skip') skip.push(row)
    else unknown.push(row)
  }

  run.sort((a, b) => (PHASE[a.kind] || 99) - (PHASE[b.kind] || 99) || a.name.localeCompare(b.name))

  console.log(`Pasta: ${dir}`)
  console.log(`Arquivos: ${files.length}\n`)

  const block = (t, arr) => {
    if (!arr.length) return
    console.log(`--- ${t} (${arr.length}) ---`)
    for (const x of arr) {
      const phase = PHASE[x.kind] != null ? ` [fase ${PHASE[x.kind]}]` : ''
      console.log(`  • ${x.name}${phase}`)
      console.log(`    ${x.label}${x.reason ? ` → ${x.reason}` : ''}`)
    }
    console.log('')
  }

  block('Serão executados (nesta ordem)', run)
  block('Ignorados', skip)
  block('Desconhecidos', unknown)

  if (listOnly) {
    console.log('--list-only: nada executado.')
    process.exit(0)
  }

  let failures = 0
  for (const item of run) {
    const scriptPath = path.join(scriptsDir, item.script)
    const args = [scriptPath]
    if (dryRun) args.push('--dry-run')
    args.push(item.abs)
    console.log(`\n>>> ${item.script} (${item.kind}) <<<\n`)
    const r = spawnSync(node, args, {
      stdio: 'inherit',
      cwd: path.join(scriptsDir, '..'),
      env: process.env,
    })
    if (r.status !== 0) failures++
  }

  console.log(`\nFim. Erros: ${failures}/${run.length}`)
}

main()
