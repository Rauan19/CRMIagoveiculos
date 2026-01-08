// Script para mudar o role de um usuário
// Uso: node scripts/changeUserRole.js email@exemplo.com admin

const prisma = require('../models/prisma');

async function changeUserRole() {
  const email = process.argv[2];
  const newRole = process.argv[3];

  if (!email || !newRole) {
    console.error('Uso: node scripts/changeUserRole.js <email> <role>');
    console.error('Exemplo: node scripts/changeUserRole.js rauanconceicao75@gmail.com admin');
    process.exit(1);
  }

  const validRoles = ['admin', 'gerente', 'vendedor'];
  if (!validRoles.includes(newRole)) {
    console.error(`Role inválido. Use um dos seguintes: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log('✅ Role atualizado com sucesso!');
    console.log('Usuário:', user);
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Usuário com email "${email}" não encontrado.`);
    } else {
      console.error('❌ Erro ao atualizar role:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

changeUserRole();


