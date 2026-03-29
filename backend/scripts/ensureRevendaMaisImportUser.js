/**
 * Se não existir nenhum User, cria um vendedor fallback para importação Revenda Mais.
 * Os scripts usam users[0] ou IMPORT_DEFAULT_SELLER_ID como fallback quando o nome
 * do vendedor da planilha não casa com User.name.
 *
 * Uso: node scripts/ensureRevendaMaisImportUser.js
 * .env opcional: IMPORT_SYSTEM_USER_EMAIL, IMPORT_SYSTEM_USER_PASSWORD
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_EMAIL = 'import.revendamais@local.crm'
const DEFAULT_NAME = 'Importação Revenda Mais'

async function main() {
  const count = await prisma.user.count()
  if (count > 0) {
    console.log(`[import-prep] ${count} usuário(s) no banco — nada a criar.`)
    return
  }

  const email = (process.env.IMPORT_SYSTEM_USER_EMAIL || DEFAULT_EMAIL).trim()
  const passwordPlain = process.env.IMPORT_SYSTEM_USER_PASSWORD || 'TrocarDepois123'
  const hash = bcrypt.hashSync(passwordPlain, 10)

  const u = await prisma.user.create({
    data: {
      name: DEFAULT_NAME,
      email,
      password: hash,
      role: 'vendedor',
      receivesCommission: true,
    },
    select: { id: true, email: true },
  })

  console.log(
    `[import-prep] Banco sem usuários: criado vendedor fallback id=${u.id} (${u.email}). ` +
      'Senha inicial: veja IMPORT_SYSTEM_USER_PASSWORD no .env ou o padrão do script. Troque após o primeiro login.'
  )
}

main()
  .catch((e) => {
    console.error('[import-prep]', e.message || e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
