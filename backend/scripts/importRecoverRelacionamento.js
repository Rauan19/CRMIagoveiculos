/**
 * Orquestrador de recuperação para a pasta:
 *   backend/services/recupertodosesserelcionameto
 *
 * Objetivo:
 * - Rodar o batch do Revenda Mais nessa pasta
 * - Ativar modo merge (IMPORT_MERGE=1) para enriquecer dados sem duplicar
 *
 * Uso:
 *   node scripts/importRecoverRelacionamento.js [--dry-run] [--list-only] [--dir <pasta>]
 *
 * Obs:
 * - --list-only só lista classificação (não importa nada)
 * - IMPORT_DEFAULT_SELLER_ID pode ser necessário em relatórios de vendidos/estoque externo
 */
const path = require('path')
const { spawnSync } = require('child_process')

const backendRoot = path.resolve(__dirname, '..')
const defaultDir = path.join(backendRoot, 'services', 'recupertodosesserelcionameto')

function argValue(argv, flag) {
  const i = argv.indexOf(flag)
  if (i === -1) return null
  return argv[i + 1] || null
}

function runNode(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName)
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: backendRoot,
    env: { ...process.env },
  })
  return r.status === 0
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const listOnly = argv.includes('--list-only')
  const customDir = argValue(argv, '--dir')
  const dir = customDir ? path.resolve(customDir) : defaultDir

  if (process.env.IMPORT_MERGE === undefined) process.env.IMPORT_MERGE = '1'

  console.log('=== Recuperação (relacionamento) ===')
  console.log('Pasta:', dir)
  console.log('IMPORT_MERGE:', process.env.IMPORT_MERGE)
  if (dryRun) console.log('Modo: dry-run')
  if (listOnly) console.log('Modo: list-only')
  console.log('')

  if (!runNode('ensureRevendaMaisImportUser.js')) process.exit(1)

  const batchArgs = ['--dir', dir]
  if (dryRun) batchArgs.unshift('--dry-run')
  if (listOnly) batchArgs.unshift('--list-only')

  if (!runNode('importRevendaMaisBatch.js', batchArgs)) process.exit(1)

  console.log('\n=== Fim recuperação (relacionamento) ===')
}

main()

