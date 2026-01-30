// Script para testar conexão com o banco de dados
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...')
  console.log('📍 Host:', process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1] || 'não encontrado')
  console.log('🔌 Porta:', process.env.DATABASE_URL?.match(/:(\d+)\//)?.[1] || 'não encontrada')
  console.log('📊 Database:', process.env.DATABASE_URL?.match(/\/([^?]+)/)?.[1] || 'não encontrado')
  console.log('')

  try {
    // Tentar conectar
    await prisma.$connect()
    console.log('✅ Conexão estabelecida com sucesso!')
    
    // Testar uma query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query de teste executada com sucesso!')
    console.log('Resultado:', result)
    
    // Contar registros em algumas tabelas
    try {
      const customerCount = await prisma.customer.count()
      console.log(`📊 Total de clientes: ${customerCount}`)
    } catch (e) {
      console.log('⚠️  Não foi possível contar clientes:', e.message)
    }
    
    try {
      const vehicleCount = await prisma.vehicle.count()
      console.log(`📊 Total de veículos: ${vehicleCount}`)
    } catch (e) {
      console.log('⚠️  Não foi possível contar veículos:', e.message)
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message)
    console.error('')
    console.error('💡 Possíveis soluções:')
    console.error('1. Verifique se o servidor PostgreSQL está rodando')
    console.error('2. Verifique se o IP e porta estão corretos')
    console.error('3. Verifique se o firewall permite conexões na porta 5433')
    console.error('4. Verifique se as credenciais (usuário/senha) estão corretas')
    console.error('5. Teste a conexão manualmente com: psql -h 31.97.170.143 -p 5433 -U iagoveiculos -d iagoveiculos')
    console.error('')
    console.error('Detalhes do erro:', error)
  } finally {
    await prisma.$disconnect()
    console.log('')
    console.log('🔌 Conexão encerrada')
  }
}

testConnection()
