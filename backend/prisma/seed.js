const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de categorias financeiras...')

  // Limpar categorias existentes (opcional - descomente se quiser resetar)
  // await prisma.categoriaFinanceira.deleteMany({})

  // Nível 1: Categorias principais
  const receitas = await prisma.categoriaFinanceira.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nome: 'Receitas',
      nivel: 1,
      codigo: 'REC',
      descricao: 'Categorias de receitas',
      ativo: true
    }
  })

  const despesas = await prisma.categoriaFinanceira.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      nome: 'Despesas',
      nivel: 1,
      codigo: 'DES',
      descricao: 'Categorias de despesas',
      ativo: true
    }
  })

  const adiantamentos = await prisma.categoriaFinanceira.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      nome: 'Adiantamentos',
      nivel: 1,
      codigo: 'ADI',
      descricao: 'Adiantamentos e antecipações',
      ativo: true
    }
  })

  // Nível 2: Subcategorias de Receitas
  const receitasVendas = await prisma.categoriaFinanceira.upsert({
    where: { id: 10 },
    update: {},
    create: {
      id: 10,
      nome: 'Vendas de Veículos',
      nivel: 2,
      parentId: receitas.id,
      codigo: 'REC-VEN',
      descricao: 'Receitas com vendas de veículos',
      ativo: true
    }
  })

  const receitasServicos = await prisma.categoriaFinanceira.upsert({
    where: { id: 11 },
    update: {},
    create: {
      id: 11,
      nome: 'Serviços',
      nivel: 2,
      parentId: receitas.id,
      codigo: 'REC-SER',
      descricao: 'Receitas com serviços prestados',
      ativo: true
    }
  })

  const receitasOutras = await prisma.categoriaFinanceira.upsert({
    where: { id: 12 },
    update: {},
    create: {
      id: 12,
      nome: 'Outras Receitas',
      nivel: 2,
      parentId: receitas.id,
      codigo: 'REC-OUT',
      descricao: 'Outras receitas operacionais',
      ativo: true
    }
  })

  // Nível 2: Subcategorias de Despesas
  const despesasAdministrativas = await prisma.categoriaFinanceira.upsert({
    where: { id: 20 },
    update: {},
    create: {
      id: 20,
      nome: 'Administrativas',
      nivel: 2,
      parentId: despesas.id,
      codigo: 'DES-ADM',
      descricao: 'Despesas administrativas',
      ativo: true
    }
  })

  const despesasOperacionais = await prisma.categoriaFinanceira.upsert({
    where: { id: 21 },
    update: {},
    create: {
      id: 21,
      nome: 'Operacionais',
      nivel: 2,
      parentId: despesas.id,
      codigo: 'DES-OPE',
      descricao: 'Despesas operacionais',
      ativo: true
    }
  })

  const despesasFinanceiras = await prisma.categoriaFinanceira.upsert({
    where: { id: 22 },
    update: {},
    create: {
      id: 22,
      nome: 'Financeiras',
      nivel: 2,
      parentId: despesas.id,
      codigo: 'DES-FIN',
      descricao: 'Despesas financeiras',
      ativo: true
    }
  })

  const despesasComerciais = await prisma.categoriaFinanceira.upsert({
    where: { id: 23 },
    update: {},
    create: {
      id: 23,
      nome: 'Comerciais',
      nivel: 2,
      parentId: despesas.id,
      codigo: 'DES-COM',
      descricao: 'Despesas comerciais',
      ativo: true
    }
  })

  // Nível 2: Subcategorias de Adiantamentos
  const adiantamentoCliente = await prisma.categoriaFinanceira.upsert({
    where: { id: 30 },
    update: {},
    create: {
      id: 30,
      nome: 'Adiantamento de Cliente',
      nivel: 2,
      parentId: adiantamentos.id,
      codigo: 'ADI-CLI',
      descricao: 'Adiantamentos feitos a clientes',
      ativo: true
    }
  })

  const adiantamentoFornecedor = await prisma.categoriaFinanceira.upsert({
    where: { id: 31 },
    update: {},
    create: {
      id: 31,
      nome: 'Adiantamento de Fornecedor',
      nivel: 2,
      parentId: adiantamentos.id,
      codigo: 'ADI-FOR',
      descricao: 'Adiantamentos recebidos de fornecedores',
      ativo: true
    }
  })

  // Nível 3: Subcategorias de Vendas de Veículos
  const vendasNovos = await prisma.categoriaFinanceira.upsert({
    where: { id: 100 },
    update: {},
    create: {
      id: 100,
      nome: 'Veículos Novos',
      nivel: 3,
      parentId: receitasVendas.id,
      codigo: 'REC-VEN-NOV',
      descricao: 'Vendas de veículos novos',
      ativo: true
    }
  })

  const vendasUsados = await prisma.categoriaFinanceira.upsert({
    where: { id: 101 },
    update: {},
    create: {
      id: 101,
      nome: 'Veículos Usados',
      nivel: 3,
      parentId: receitasVendas.id,
      codigo: 'REC-VEN-USU',
      descricao: 'Vendas de veículos usados',
      ativo: true
    }
  })

  // Nível 3: Subcategorias de Serviços
  const servicosManutencao = await prisma.categoriaFinanceira.upsert({
    where: { id: 110 },
    update: {},
    create: {
      id: 110,
      nome: 'Manutenção',
      nivel: 3,
      parentId: receitasServicos.id,
      codigo: 'REC-SER-MAN',
      descricao: 'Serviços de manutenção',
      ativo: true
    }
  })

  const servicosVistoria = await prisma.categoriaFinanceira.upsert({
    where: { id: 111 },
    update: {},
    create: {
      id: 111,
      nome: 'Vistoria',
      nivel: 3,
      parentId: receitasServicos.id,
      codigo: 'REC-SER-VIS',
      descricao: 'Serviços de vistoria',
      ativo: true
    }
  })

  // Nível 3: Subcategorias Administrativas
  const admCartorios = await prisma.categoriaFinanceira.upsert({
    where: { id: 200 },
    update: {},
    create: {
      id: 200,
      nome: 'Cartórios',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-CAR',
      descricao: 'Despesas com cartórios',
      ativo: true
    }
  })

  const admContador = await prisma.categoriaFinanceira.upsert({
    where: { id: 201 },
    update: {},
    create: {
      id: 201,
      nome: 'Contador',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-CON',
      descricao: 'Despesas com contador',
      ativo: true
    }
  })

  const admSalarios = await prisma.categoriaFinanceira.upsert({
    where: { id: 202 },
    update: {},
    create: {
      id: 202,
      nome: 'Salários',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-SAL',
      descricao: 'Salários e encargos',
      ativo: true
    }
  })

  const admAluguel = await prisma.categoriaFinanceira.upsert({
    where: { id: 203 },
    update: {},
    create: {
      id: 203,
      nome: 'Aluguel',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-ALU',
      descricao: 'Aluguel e condomínio',
      ativo: true
    }
  })

  const admEnergia = await prisma.categoriaFinanceira.upsert({
    where: { id: 204 },
    update: {},
    create: {
      id: 204,
      nome: 'Energia e Água',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-ENE',
      descricao: 'Energia elétrica e água',
      ativo: true
    }
  })

  const admTelefone = await prisma.categoriaFinanceira.upsert({
    where: { id: 205 },
    update: {},
    create: {
      id: 205,
      nome: 'Telefone e Internet',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-TEL',
      descricao: 'Telefone e internet',
      ativo: true
    }
  })

  const admMaterial = await prisma.categoriaFinanceira.upsert({
    where: { id: 206 },
    update: {},
    create: {
      id: 206,
      nome: 'Material de Escritório',
      nivel: 3,
      parentId: despesasAdministrativas.id,
      codigo: 'DES-ADM-MAT',
      descricao: 'Material de escritório',
      ativo: true
    }
  })

  // Nível 3: Subcategorias Operacionais
  const opeManutencao = await prisma.categoriaFinanceira.upsert({
    where: { id: 210 },
    update: {},
    create: {
      id: 210,
      nome: 'Manutenção de Veículos',
      nivel: 3,
      parentId: despesasOperacionais.id,
      codigo: 'DES-OPE-MAN',
      descricao: 'Manutenção e reparos de veículos',
      ativo: true
    }
  })

  const opeCombustivel = await prisma.categoriaFinanceira.upsert({
    where: { id: 211 },
    update: {},
    create: {
      id: 211,
      nome: 'Combustível',
      nivel: 3,
      parentId: despesasOperacionais.id,
      codigo: 'DES-OPE-COM',
      descricao: 'Combustível para veículos',
      ativo: true
    }
  })

  const opeSeguros = await prisma.categoriaFinanceira.upsert({
    where: { id: 212 },
    update: {},
    create: {
      id: 212,
      nome: 'Seguros',
      nivel: 3,
      parentId: despesasOperacionais.id,
      codigo: 'DES-OPE-SEG',
      descricao: 'Seguros de veículos',
      ativo: true
    }
  })

  const opeLavagem = await prisma.categoriaFinanceira.upsert({
    where: { id: 213 },
    update: {},
    create: {
      id: 213,
      nome: 'Lavagem e Detalhamento',
      nivel: 3,
      parentId: despesasOperacionais.id,
      codigo: 'DES-OPE-LAV',
      descricao: 'Lavagem e detalhamento de veículos',
      ativo: true
    }
  })

  // Nível 3: Subcategorias Financeiras
  const finJuros = await prisma.categoriaFinanceira.upsert({
    where: { id: 220 },
    update: {},
    create: {
      id: 220,
      nome: 'Juros Pagos',
      nivel: 3,
      parentId: despesasFinanceiras.id,
      codigo: 'DES-FIN-JUR',
      descricao: 'Juros e encargos financeiros',
      ativo: true
    }
  })

  const finTaxas = await prisma.categoriaFinanceira.upsert({
    where: { id: 221 },
    update: {},
    create: {
      id: 221,
      nome: 'Taxas Bancárias',
      nivel: 3,
      parentId: despesasFinanceiras.id,
      codigo: 'DES-FIN-TAX',
      descricao: 'Taxas bancárias e tarifas',
      ativo: true
    }
  })

  // Nível 3: Subcategorias Comerciais
  const comMarketing = await prisma.categoriaFinanceira.upsert({
    where: { id: 230 },
    update: {},
    create: {
      id: 230,
      nome: 'Marketing e Publicidade',
      nivel: 3,
      parentId: despesasComerciais.id,
      codigo: 'DES-COM-MAR',
      descricao: 'Marketing e publicidade',
      ativo: true
    }
  })

  const comComissoes = await prisma.categoriaFinanceira.upsert({
    where: { id: 231 },
    update: {},
    create: {
      id: 231,
      nome: 'Comissões Pagas',
      nivel: 3,
      parentId: despesasComerciais.id,
      codigo: 'DES-COM-COM',
      descricao: 'Comissões pagas a vendedores',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Vendas
  await prisma.categoriaFinanceira.upsert({
    where: { id: 1000 },
    update: {},
    create: {
      id: 1000,
      nome: 'Venda à Vista',
      nivel: 4,
      parentId: vendasNovos.id,
      codigo: 'REC-VEN-NOV-VISTA',
      descricao: 'Venda de veículo novo à vista',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 1001 },
    update: {},
    create: {
      id: 1001,
      nome: 'Venda Financiada',
      nivel: 4,
      parentId: vendasNovos.id,
      codigo: 'REC-VEN-NOV-FIN',
      descricao: 'Venda de veículo novo financiado',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 1010 },
    update: {},
    create: {
      id: 1010,
      nome: 'Venda à Vista',
      nivel: 4,
      parentId: vendasUsados.id,
      codigo: 'REC-VEN-USU-VISTA',
      descricao: 'Venda de veículo usado à vista',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 1011 },
    update: {},
    create: {
      id: 1011,
      nome: 'Venda Financiada',
      nivel: 4,
      parentId: vendasUsados.id,
      codigo: 'REC-VEN-USU-FIN',
      descricao: 'Venda de veículo usado financiado',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Serviços
  await prisma.categoriaFinanceira.upsert({
    where: { id: 1100 },
    update: {},
    create: {
      id: 1100,
      nome: 'Revisão',
      nivel: 4,
      parentId: servicosManutencao.id,
      codigo: 'REC-SER-MAN-REV',
      descricao: 'Serviços de revisão',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 1101 },
    update: {},
    create: {
      id: 1101,
      nome: 'Reparo',
      nivel: 4,
      parentId: servicosManutencao.id,
      codigo: 'REC-SER-MAN-REP',
      descricao: 'Serviços de reparo',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Administrativas
  await prisma.categoriaFinanceira.upsert({
    where: { id: 2000 },
    update: {},
    create: {
      id: 2000,
      nome: 'Taxas Cartoriais',
      nivel: 4,
      parentId: admCartorios.id,
      codigo: 'DES-ADM-CAR-TAX',
      descricao: 'Taxas e emolumentos cartoriais',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2001 },
    update: {},
    create: {
      id: 2001,
      nome: 'Transferência de Veículo',
      nivel: 4,
      parentId: admCartorios.id,
      codigo: 'DES-ADM-CAR-TRA',
      descricao: 'Custos de transferência de veículo',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2010 },
    update: {},
    create: {
      id: 2010,
      nome: 'Honorários Contábeis',
      nivel: 4,
      parentId: admContador.id,
      codigo: 'DES-ADM-CON-HON',
      descricao: 'Honorários do contador',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2011 },
    update: {},
    create: {
      id: 2011,
      nome: 'Impostos e Taxas',
      nivel: 4,
      parentId: admContador.id,
      codigo: 'DES-ADM-CON-IMP',
      descricao: 'Impostos e taxas contábeis',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2020 },
    update: {},
    create: {
      id: 2020,
      nome: 'Salários Funcionários',
      nivel: 4,
      parentId: admSalarios.id,
      codigo: 'DES-ADM-SAL-FUN',
      descricao: 'Salários de funcionários',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2021 },
    update: {},
    create: {
      id: 2021,
      nome: 'Encargos Sociais',
      nivel: 4,
      parentId: admSalarios.id,
      codigo: 'DES-ADM-SAL-ENC',
      descricao: 'Encargos sociais e trabalhistas',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2022 },
    update: {},
    create: {
      id: 2022,
      nome: 'Comissões Vendedores',
      nivel: 4,
      parentId: admSalarios.id,
      codigo: 'DES-ADM-SAL-COM',
      descricao: 'Comissões de vendedores',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Operacionais
  await prisma.categoriaFinanceira.upsert({
    where: { id: 2100 },
    update: {},
    create: {
      id: 2100,
      nome: 'Mecânica',
      nivel: 4,
      parentId: opeManutencao.id,
      codigo: 'DES-OPE-MAN-MEC',
      descricao: 'Manutenção mecânica',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2101 },
    update: {},
    create: {
      id: 2101,
      nome: 'Elétrica',
      nivel: 4,
      parentId: opeManutencao.id,
      codigo: 'DES-OPE-MAN-ELE',
      descricao: 'Manutenção elétrica',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2102 },
    update: {},
    create: {
      id: 2102,
      nome: 'Funilaria e Pintura',
      nivel: 4,
      parentId: opeManutencao.id,
      codigo: 'DES-OPE-MAN-FUN',
      descricao: 'Funilaria e pintura',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Financeiras
  await prisma.categoriaFinanceira.upsert({
    where: { id: 2200 },
    update: {},
    create: {
      id: 2200,
      nome: 'Juros de Financiamento',
      nivel: 4,
      parentId: finJuros.id,
      codigo: 'DES-FIN-JUR-FIN',
      descricao: 'Juros de financiamentos',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2201 },
    update: {},
    create: {
      id: 2201,
      nome: 'Juros de Empréstimo',
      nivel: 4,
      parentId: finJuros.id,
      codigo: 'DES-FIN-JUR-EMP',
      descricao: 'Juros de empréstimos',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2210 },
    update: {},
    create: {
      id: 2210,
      nome: 'Tarifas de Conta',
      nivel: 4,
      parentId: finTaxas.id,
      codigo: 'DES-FIN-TAX-CON',
      descricao: 'Tarifas de conta corrente',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2211 },
    update: {},
    create: {
      id: 2211,
      nome: 'Taxas de Operação',
      nivel: 4,
      parentId: finTaxas.id,
      codigo: 'DES-FIN-TAX-OPE',
      descricao: 'Taxas de operações bancárias',
      ativo: true
    }
  })

  // Nível 4: Categorias finais - Comerciais
  await prisma.categoriaFinanceira.upsert({
    where: { id: 2300 },
    update: {},
    create: {
      id: 2300,
      nome: 'Anúncios Online',
      nivel: 4,
      parentId: comMarketing.id,
      codigo: 'DES-COM-MAR-ONL',
      descricao: 'Anúncios em sites e plataformas',
      ativo: true
    }
  })

  await prisma.categoriaFinanceira.upsert({
    where: { id: 2301 },
    update: {},
    create: {
      id: 2301,
      nome: 'Material Gráfico',
      nivel: 4,
      parentId: comMarketing.id,
      codigo: 'DES-COM-MAR-GRA',
      descricao: 'Material gráfico e impressos',
      ativo: true
    }
  })

  // Nível 4: Adiantamento de Cliente
  await prisma.categoriaFinanceira.upsert({
    where: { id: 3000 },
    update: {},
    create: {
      id: 3000,
      nome: 'Adiantamento de Cliente',
      nivel: 4,
      parentId: adiantamentoCliente.id,
      codigo: 'ADI-CLI-ADI',
      descricao: 'Adiantamento feito a cliente',
      ativo: true
    }
  })

  // Nível 4: Adiantamento de Fornecedor
  await prisma.categoriaFinanceira.upsert({
    where: { id: 3100 },
    update: {},
    create: {
      id: 3100,
      nome: 'Adiantamento de Fornecedor',
      nivel: 4,
      parentId: adiantamentoFornecedor.id,
      codigo: 'ADI-FOR-ADI',
      descricao: 'Adiantamento recebido de fornecedor',
      ativo: true
    }
  })

  console.log('✅ Seed de categorias financeiras concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
