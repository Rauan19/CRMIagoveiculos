/**
 * Varre uma pasta de .XLS (Revenda Mais), classifica pelo <Title> e roda importadores na ordem certa.
 *
 * Ordem: clientes → vendas (com cliente → dados venda) → estoque externo → estoque → estoque doc → FIPE → valor mínimo → canal → aniversariantes
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
  'vendidos-cheque': 'importRevendaMaisVendidosComCheque.js',
  'estoque-externo': 'importRevendaMaisEstoqueExterno.js',
  estoque: 'importRevendaMaisEstoqueGerencial.js',
  'estoque-doc': 'importRevendaMaisEstoqueDocumentacao.js',
  'relacao-notas': 'importRevendaMaisRelacaoNotas.js',
  'impostos-vendidos': 'importRevendaMaisImpostosVendidos.js',
  'veiculos-troca': 'importRevendaMaisVeiculosNaTroca.js',
  'veiculos-devolvidos': 'importRevendaMaisVeiculosDevolvidos.js',
  fipe: 'importRevendaMaisEnriquecerFipe.js',
  'valor-minimo': 'importRevendaMaisEnriquecerValorMinimo.js',
  'canal-venda': 'importRevendaMaisCanalVenda.js',
  aniversariantes: 'importRevendaMaisAniversariantes.js',
  'cr-lista': 'importRevendaMaisContasReceberLista.js',
  'cr-cobranca': 'importRevendaMaisContasReceberCobranca.js',
  'cp-entrada': 'importRevendaMaisContasPagarEntradaVeiculo.js',
  recebimento: 'importRevendaMaisRelatorioRecebimento.js',
}

const PHASE = {
  'clientes-vendedor': 10,
  'vendidos-cliente': 20,
  'vendidos-dados': 30,
  'vendidos-cheque': 31,
  'estoque-externo': 35,
  estoque: 40,
  'relacao-notas': 45,
  'estoque-doc': 50,
  'impostos-vendidos': 52,
  'veiculos-troca': 53,
  'veiculos-devolvidos': 54,
  fipe: 60,
  'valor-minimo': 70,
  'canal-venda': 80,
  aniversariantes: 90,
  'cr-lista': 100,
  'cr-cobranca': 101,
  'cp-entrada': 110,
  recebimento: 120,
}

function classifyFile(absPath) {
  const title = readSpreadsheetTitle(absPath)
  const base = path.basename(absPath, path.extname(absPath))
  const blob = normalizeAscii(title || base)

  const pending = (reason) => ({ kind: 'skip', label: title || base, script: null, reason })

  if (!blob) return { kind: 'unknown', label: '(sem título)', script: null }

  // VENDIDOS (dados da venda) — precisa vir antes do genérico de vendidos
  if (blob.includes('dados da venda') && blob.includes('vendid')) {
    return { kind: 'vendidos-dados', label: title || base, script: SCRIPTS['vendidos-dados'] }
  }
  if (blob.includes('gerencial') && blob.includes('estoque') && blob.includes('externo')) {
    return { kind: 'estoque-externo', label: title || base, script: SCRIPTS['estoque-externo'] }
  }
  // VENDIDOS (com cliente) — várias variações de título
  if (
    (blob.includes('com cliente') && blob.includes('vendid')) ||
    (blob.includes('relacao') && blob.includes('vendid') && blob.includes('cliente')) ||
    (blob.includes('relacao') && blob.includes('vendid') && blob.includes('com cliente'))
  ) {
    return { kind: 'vendidos-cliente', label: title || base, script: SCRIPTS['vendidos-cliente'] }
  }
  // VENDIDOS (com vendedor) e variações — mesmo importador lê coluna Vendedor quando existir
  if (blob.includes('vendid') && blob.includes('vendedor')) {
    return { kind: 'vendidos-cliente', label: title || base, script: SCRIPTS['vendidos-cliente'] }
  }
  // VENDIDOS (sem "com cliente") mas com Cliente/Celular no layout — mesmo importador
  if (blob.includes('lista gerencial de veiculos vendidos') || blob === 'relacao de vendidos') {
    if (blob.includes('cheque')) return { kind: 'vendidos-cheque', label: title || base, script: SCRIPTS['vendidos-cheque'] }
    if (blob === 'relacao de vendidos') return pending('Relação de Vendidos — sem cliente no relatório; usar apenas para enriquecimento (a implementar)')
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
  if (blob.includes('contas a receber') && blob.includes('lista')) {
    return { kind: 'cr-lista', label: title || base, script: SCRIPTS['cr-lista'] }
  }
  if (blob.includes('contas a receber') && blob.includes('cobranca')) {
    return { kind: 'cr-cobranca', label: title || base, script: SCRIPTS['cr-cobranca'] }
  }
  if (blob.includes('contas a pagar') && blob.includes('entrada') && blob.includes('veicul')) {
    return { kind: 'cp-entrada', label: title || base, script: SCRIPTS['cp-entrada'] }
  }
  if (blob.includes('relatorio de recebimento')) {
    return { kind: 'recebimento', label: title || base, script: SCRIPTS.recebimento }
  }

  if (blob.includes('relacao de notas')) {
    return { kind: 'relacao-notas', label: title || base, script: SCRIPTS['relacao-notas'] }
  }
  if (blob.includes('impostos') && blob.includes('vendidos')) {
    return { kind: 'impostos-vendidos', label: title || base, script: SCRIPTS['impostos-vendidos'] }
  }
  if (blob.includes('veiculos') && blob.includes('troca')) {
    return { kind: 'veiculos-troca', label: title || base, script: SCRIPTS['veiculos-troca'] }
  }
  if (blob.includes('veiculos') && blob.includes('devolv')) {
    return { kind: 'veiculos-devolvidos', label: title || base, script: SCRIPTS['veiculos-devolvidos'] }
  }

  // Alguns arquivos vêm como "Relação de Estoque" / "Listagem de Estoque" mas o layout costuma ser o mesmo da lista gerencial.
  // Ainda assim o importador faz validação de cabeçalho e pode SKIP se divergir.
  if (
    (blob.includes('relacao') && blob.includes('estoque')) ||
    (blob.includes('listagem') && blob.includes('estoque'))
  ) {
    if (blob.includes('por marcas')) return pending('Estoque por marcas — agregado')
    // "Listagem de Estoque" não possui "Cod" (código RM) no cabeçalho e pode causar duplicações;
    // manter fora do lote até existir importador seguro para esse layout.
    if (blob === 'listagem de estoque') return pending('Listagem de Estoque — sem código (risco duplicar) — precisa importador próprio')
    return { kind: 'estoque', label: title || base, script: SCRIPTS.estoque }
  }

  // Relatórios financeiros/gerenciais que não entram no CRM (por enquanto)
  if (blob.includes('vendas mensais')) return pending('Resumo mensal — não importa linha a linha')
  if (blob.includes('comparativo') && blob.includes('financeir')) return pending('Comparativo — resumo')
  if (blob.includes('contas a pagar') && blob.includes('entrada')) return pending('Contas entrada veículo — vazio ou layout próprio')
  if (blob.includes('retorno de financiamento')) return pending('Retorno financiamento — sem parser neste lote')
  if (blob.includes('estoque por marcas')) return pending('Estoque por marcas — agregado')
  if (blob.includes('contas a receber')) return pending('Financeiro (contas a receber) — sem importador neste lote')
  if (blob.includes('saldo')) return pending('Financeiro (saldo) — sem importador neste lote')
  if (blob.includes('comissao')) return pending('Financeiro (comissão) — sem importador neste lote')

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
