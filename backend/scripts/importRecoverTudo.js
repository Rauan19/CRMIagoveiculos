/**
 * Orquestrador "tudo" (clientes + Revenda Mais) para restaurar dados no banco.
 *
 * Fluxo:
 * - Importa clientes via .xlsx (se encontrado/passo fornecido)
 * - Garante usuário fallback de importação
 * - Roda batch na pasta services/recuperaressenovos (pequena)
 * - Roda batch na pasta services/recupertodosesserelcionameto (228+ arquivos)
 *
 * Por padrão ativa merge/enriquecimento (IMPORT_MERGE=1).
 *
 * Uso:
 *   node scripts/importRecoverTudo.js [--dry-run] [--list-only]
 *     [--dir-novos <pasta>] [--dir-rel <pasta>]
 *     [--clientes-xlsx <arquivo.xlsx>]
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const backendRoot = path.resolve(__dirname, '..')
const defaultDirNovos = path.join(backendRoot, 'services', 'recuperaressenovos')
const defaultDirRel = path.join(backendRoot, 'services', 'recupertodosesserelcionameto')

function argValue(argv, flag) {
  const i = argv.indexOf(flag)
  if (i === -1) return null
  return argv[i + 1] || null
}

function runNode(scriptName, args = [], envExtra = {}) {
  const scriptPath = path.join(__dirname, scriptName)
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: backendRoot,
    env: { ...process.env, ...envExtra },
  })
  return r.status === 0
}

function pickClientesXlsxFromDir(dir) {
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((f) => /\.xlsx$/i.test(f))
  if (!files.length) return null
  // Evita planilhas que não são cadastro de clientes (ex.: Financeiro*.xlsx)
  const preferred = files.find((f) => /3c635772/i.test(f)) || files.find((f) => !/financeir/i.test(f))
  return preferred ? path.join(dir, preferred) : path.join(dir, files[0])
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const listOnly = argv.includes('--list-only')

  const dirNovosArg = argValue(argv, '--dir-novos')
  const dirRelArg = argValue(argv, '--dir-rel')
  const clientesXlsxArg = argValue(argv, '--clientes-xlsx')

  const dirNovos = dirNovosArg ? path.resolve(dirNovosArg) : defaultDirNovos
  const dirRel = dirRelArg ? path.resolve(dirRelArg) : defaultDirRel

  if (process.env.IMPORT_MERGE === undefined) process.env.IMPORT_MERGE = '1'

  console.log('=== Recuperação TUDO (clientes + RM) ===')
  console.log('IMPORT_MERGE:', process.env.IMPORT_MERGE)
  console.log('Pasta novos:', dirNovos)
  console.log('Pasta relacionamento:', dirRel)
  if (dryRun) console.log('Modo: dry-run')
  if (listOnly) console.log('Modo: list-only')
  console.log('')

  const clientesXlsx =
    clientesXlsxArg ? path.resolve(clientesXlsxArg) : pickClientesXlsxFromDir(dirNovos) || null

  if (clientesXlsx) {
    console.log('Clientes XLSX:', clientesXlsx)
    const args = []
    if (dryRun) args.push('--dry-run')
    args.push(clientesXlsx)
    if (!runNode('importClientesXlsx.js', args)) process.exit(1)
    console.log('')
  } else {
    console.log('Clientes XLSX: (não encontrado) — pulando importClientesXlsx')
    console.log('')
  }

  if (!runNode('ensureRevendaMaisImportUser.js')) process.exit(1)

  const batchFlags = []
  if (dryRun) batchFlags.push('--dry-run')
  if (listOnly) batchFlags.push('--list-only')

  if (fs.existsSync(dirNovos)) {
    if (!runNode('importRevendaMaisBatch.js', [...batchFlags, '--dir', dirNovos])) process.exit(1)
  }
  if (fs.existsSync(dirRel)) {
    if (!runNode('importRevendaMaisBatch.js', [...batchFlags, '--dir', dirRel])) process.exit(1)
  }

  console.log('\n=== Fim recuperação TUDO ===')
}

main()

