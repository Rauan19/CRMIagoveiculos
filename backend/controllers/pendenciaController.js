const prisma = require('../models/prisma')

class PendenciaController {
  async list(req, res) {
    try {
      if (!prisma.pendencia) {
        return res.status(503).json({
          error: 'Prisma Client desatualizado. Execute no backend: npx prisma generate'
        })
      }
      const { status, vehicleId } = req.query
      const where = {}
      if (status) where.status = status
      if (vehicleId) where.vehicleId = parseInt(vehicleId)

      const pendencias = await prisma.pendencia.findMany({
        where,
        include: {
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, plate: true }
          },
          responsavel: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.json(pendencias)
    } catch (error) {
      console.error('Erro ao listar pendências:', error)
      res.status(500).json({ error: 'Erro ao listar pendências' })
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params
      const pendencia = await prisma.pendencia.findUnique({
        where: { id: parseInt(id) },
        include: {
          vehicle: true,
          responsavel: { select: { id: true, name: true, email: true } }
        }
      })

      if (!pendencia) {
        return res.status(404).json({ error: 'Pendência não encontrada' })
      }

      res.json(pendencia)
    } catch (error) {
      console.error('Erro ao buscar pendência:', error)
      res.status(500).json({ error: 'Erro ao buscar pendência' })
    }
  }

  async create(req, res) {
    try {
      const { vehicleId, responsavelId, status, emailPara, descricao, dataLimite, marcador } = req.body

      if (!vehicleId || !responsavelId || !descricao || !status) {
        return res.status(400).json({ error: 'Veículo, Responsável e Descrição são obrigatórios' })
      }

      const pendencia = await prisma.pendencia.create({
        data: {
          vehicle: { connect: { id: parseInt(vehicleId) } },
          responsavel: { connect: { id: parseInt(responsavelId) } },
          status: status || 'aberto',
          emailPara: emailPara || null,
          descricao: String(descricao).trim(),
          dataLimite: dataLimite ? new Date(dataLimite) : null,
          marcador: marcador || null
        },
        include: {
          vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
          responsavel: { select: { id: true, name: true, email: true } }
        }
      })

      res.status(201).json(pendencia)
    } catch (error) {
      console.error('Erro ao criar pendência:', error)
      res.status(500).json({ error: 'Erro ao criar pendência' })
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params
      const { vehicleId, responsavelId, status, emailPara, descricao, dataLimite, marcador } = req.body

      const updateData = {}
      if (vehicleId != null) updateData.vehicleId = parseInt(vehicleId)
      if (responsavelId !== undefined) updateData.responsavelId = responsavelId ? parseInt(responsavelId) : null
      if (status != null) updateData.status = status
      if (emailPara !== undefined) updateData.emailPara = emailPara || null
      if (descricao != null) updateData.descricao = String(descricao).trim()
      if (dataLimite !== undefined) updateData.dataLimite = dataLimite ? new Date(dataLimite) : null
      if (marcador !== undefined) updateData.marcador = marcador || null

      const pendencia = await prisma.pendencia.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
          responsavel: { select: { id: true, name: true, email: true } }
        }
      })

      res.json(pendencia)
    } catch (error) {
      console.error('Erro ao atualizar pendência:', error)
      res.status(500).json({ error: 'Erro ao atualizar pendência' })
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params
      await prisma.pendencia.delete({
        where: { id: parseInt(id) }
      })
      res.status(204).send()
    } catch (error) {
      console.error('Erro ao excluir pendência:', error)
      res.status(500).json({ error: 'Erro ao excluir pendência' })
    }
  }
}

module.exports = new PendenciaController()
