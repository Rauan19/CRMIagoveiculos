// Script para testar conexão com o banco de dados
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...\n');
  
  // Mostrar URL (sem senha)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('📋 DATABASE_URL:', maskedUrl);
  } else {
    console.log('❌ DATABASE_URL não encontrada no arquivo .env');
    process.exit(1);
  }
  
  console.log('\n⏳ Tentando conectar...\n');
  
  try {
    // Tentar uma query simples
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar uma query
    const userCount = await prisma.user.count();
    console.log(`📊 Total de usuários no banco: ${userCount}`);
    
    console.log('\n✅ Banco de dados está funcionando corretamente!');
    
  } catch (error) {
    console.error('\n❌ Erro ao conectar com o banco de dados:\n');
    console.error(error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n💡 Possíveis soluções:');
      console.log('   1. Verifique se o servidor de banco está online');
      console.log('   2. Verifique se o IP/porta estão corretos');
      console.log('   3. Verifique se há firewall bloqueando a conexão');
      console.log('   4. Verifique se as credenciais estão corretas');
    } else if (error.message.includes("authentication failed")) {
      console.log('\n💡 Possíveis soluções:');
      console.log('   1. Verifique se o usuário está correto');
      console.log('   2. Verifique se a senha está correta');
    } else if (error.message.includes("database") && error.message.includes("does not exist")) {
      console.log('\n💡 Possíveis soluções:');
      console.log('   1. Verifique se o nome do banco está correto');
      console.log('   2. Crie o banco de dados se necessário');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
