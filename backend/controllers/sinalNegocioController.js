const prisma = require('../models/prisma')

class SinalNegocioController {
  async list(req, res) {
    try {
      if (!prisma.sinalNegocio) {
        return res.status(503).json({
          error: 'Prisma Client desatualizado. Execute no backend: npm run generate ou npx prisma generate'
        })
      }
      const { status, customerId, vehicleId, sellerId, search } = req.query
      const where = {}
      if (status) where.status = status
      if (customerId) where.customerId = parseInt(customerId)
      if (vehicleId) where.vehicleId = parseInt(vehicleId)
      if (sellerId) where.sellerId = parseInt(sellerId)
      if (search && String(search).trim()) {
        const term = String(search).trim()
        where.OR = [
          { customer: { name: { contains: term, mode: 'insensitive' } } },
          { customer: { phone: { contains: term, mode: 'insensitive' } } },
          { customer: { cpf: { contains: term, mode: 'insensitive' } } },
          { customer: { email: { contains: term, mode: 'insensitive' } } },
          { vehicle: { brand: { contains: term, mode: 'insensitive' } } },
          { vehicle: { model: { contains: term, mode: 'insensitive' } } },
          { vehicle: { plate: { contains: term, mode: 'insensitive' } } },
          { seller: { name: { contains: term, mode: 'insensitive' } } }
        ]
      }

      const sinais = await prisma.sinalNegocio.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true, cpf: true }
          },
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, plate: true, status: true }
          },
          seller: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { data: 'desc' }
      })

      res.json(sinais)
    } catch (error) {
      console.error('Erro ao listar sinais de negócio:', error)
      res.status(500).json({ error: 'Erro ao listar sinais de negócio' })
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params
      const sinal = await prisma.sinalNegocio.findUnique({
        where: { id: parseInt(id) },
        include: {
          customer: true,
          vehicle: true,
          seller: { select: { id: true, name: true, email: true } }
        }
      })

      if (!sinal) {
        return res.status(404).json({ error: 'Sinal de negócio não encontrado' })
      }

      res.json(sinal)
    } catch (error) {
      console.error('Erro ao buscar sinal de negócio:', error)
      res.status(500).json({ error: 'Erro ao buscar sinal de negócio' })
    }
  }

  async create(req, res) {
    try {
      const { customerId, vehicleId, sellerId, valor, data, dataValidade, valorVeiculo, valorEmAberto, formaPagamento, status, observacoes } = req.body

      if (!customerId || valor == null) {
        return res.status(400).json({ error: 'Cliente e valor são obrigatórios' })
      }
      if (!sellerId) {
        return res.status(400).json({ error: 'Vendedor é obrigatório' })
      }

      const sinal = await prisma.sinalNegocio.create({
        data: {
          customer: { connect: { id: parseInt(customerId) } },
          vehicle: vehicleId ? { connect: { id: parseInt(vehicleId) } } : undefined,
          seller: { connect: { id: parseInt(sellerId) } },
          valor: parseFloat(String(valor).replace(',', '.')),
          data: data ? new Date(data) : new Date(),
          dataValidade: dataValidade ? new Date(dataValidade) : null,
          valorVeiculo: valorVeiculo != null && valorVeiculo !== '' ? parseFloat(String(valorVeiculo).replace(',', '.')) : null,
          valorEmAberto: valorEmAberto != null && valorEmAberto !== '' ? parseFloat(String(valorEmAberto).replace(',', '.')) : null,
          formaPagamento: formaPagamento || null,
          status: status || 'pendente',
          observacoes: observacoes || null
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, plate: true }
          },
          seller: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      res.status(201).json(sinal)
    } catch (error) {
      console.error('Erro ao criar sinal de negócio:', error)
      res.status(500).json({ error: 'Erro ao criar sinal de negócio' })
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params
      const {
        customerId,
        vehicleId,
        sellerId,
        valor,
        data,
        dataValidade,
        valorVeiculo,
        valorEmAberto,
        formaPagamento,
        status,
        observacoes
      } = req.body

      const updateData = {}
      if (customerId != null) updateData.customerId = parseInt(customerId)
      if (vehicleId !== undefined) updateData.vehicleId = vehicleId ? parseInt(vehicleId) : null
      if (sellerId != null) updateData.sellerId = parseInt(sellerId)
      if (valor != null) updateData.valor = parseFloat(String(valor).replace(',', '.'))
      if (data != null) updateData.data = new Date(data)
      if (dataValidade !== undefined) updateData.dataValidade = dataValidade ? new Date(dataValidade) : null
      if (valorVeiculo !== undefined) updateData.valorVeiculo = valorVeiculo != null ? parseFloat(String(valorVeiculo).replace(',', '.')) : null
      if (valorEmAberto !== undefined) updateData.valorEmAberto = valorEmAberto != null ? parseFloat(String(valorEmAberto).replace(',', '.')) : null
      if (formaPagamento !== undefined) updateData.formaPagamento = formaPagamento || null
      if (status != null) updateData.status = status
      if (observacoes !== undefined) updateData.observacoes = observacoes || null

      const sinal = await prisma.sinalNegocio.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, plate: true }
          },
          seller: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      res.json(sinal)
    } catch (error) {
      console.error('Erro ao atualizar sinal de negócio:', error)
      res.status(500).json({ error: 'Erro ao atualizar sinal de negócio' })
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params
      await prisma.sinalNegocio.delete({
        where: { id: parseInt(id) }
      })
      res.json({ message: 'Sinal de negócio excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir sinal de negócio:', error)
      res.status(500).json({ error: 'Erro ao excluir sinal de negócio' })
    }
  }
}

module.exports = new SinalNegocioController()
