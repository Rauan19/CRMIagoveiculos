const prisma = require('../models/prisma')

class DespachanteController {
  async list(req, res) {
    try {
      const despachantes = await prisma.despachante.findMany({
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
              chassi: true,
              renavam: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.json(despachantes)
    } catch (error) {
      console.error('Erro ao listar despachantes:', error)
      res.status(500).json({ error: 'Erro ao listar despachantes' })
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params
      const despachante = await prisma.despachante.findUnique({
        where: { id: parseInt(id) },
        include: {
          vehicle: true,
          customer: true
        }
      })

      if (!despachante) {
        return res.status(404).json({ error: 'Despachante não encontrado' })
      }

      res.json(despachante)
    } catch (error) {
      console.error('Erro ao buscar despachante:', error)
      res.status(500).json({ error: 'Erro ao buscar despachante' })
    }
  }

  async create(req, res) {
    try {
      const {
        tipo,
        despachanteNome,
        vehicleId,
        fornecedorId,
        customerId,
        dataEnvio,
        dataRetorno,
        dataEntrega,
        obsAdicional,
        municipioOrigem,
        municipioDestino,
        documentos,
        valores
      } = req.body

      if (!vehicleId) {
        return res.status(400).json({ error: 'Veículo é obrigatório' })
      }

      const despachante = await prisma.despachante.create({
        data: {
          tipo: tipo || 'saida',
          despachanteNome: despachanteNome || null,
          vehicleId: vehicleId ? parseInt(vehicleId) : null,
          fornecedorId: fornecedorId ? parseInt(fornecedorId) : null,
          customerId: customerId ? parseInt(customerId) : null,
          dataEnvio: dataEnvio ? new Date(dataEnvio) : null,
          dataRetorno: dataRetorno ? new Date(dataRetorno) : null,
          dataEntrega: dataEntrega ? new Date(dataEntrega) : null,
          obsAdicional: obsAdicional || null,
          municipioOrigem: municipioOrigem || null,
          municipioDestino: municipioDestino || null,
          documentos: documentos || null,
          valores: valores || null
        },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
              chassi: true,
              renavam: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      })

      res.status(201).json(despachante)
    } catch (error) {
      console.error('Erro ao criar despachante:', error)
      res.status(500).json({ error: 'Erro ao criar despachante' })
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params
      const {
        tipo,
        despachanteNome,
        vehicleId,
        fornecedorId,
        customerId,
        dataEnvio,
        dataRetorno,
        dataEntrega,
        obsAdicional,
        municipioOrigem,
        municipioDestino,
        documentos,
        valores
      } = req.body

      const updateData = {}
      if (tipo !== undefined) updateData.tipo = tipo
      if (despachanteNome !== undefined) updateData.despachanteNome = despachanteNome || null
      if (vehicleId !== undefined) updateData.vehicleId = vehicleId ? parseInt(vehicleId) : null
      if (fornecedorId !== undefined) updateData.fornecedorId = fornecedorId ? parseInt(fornecedorId) : null
      if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null
      if (dataEnvio !== undefined) updateData.dataEnvio = dataEnvio ? new Date(dataEnvio) : null
      if (dataRetorno !== undefined) updateData.dataRetorno = dataRetorno ? new Date(dataRetorno) : null
      if (dataEntrega !== undefined) updateData.dataEntrega = dataEntrega ? new Date(dataEntrega) : null
      if (obsAdicional !== undefined) updateData.obsAdicional = obsAdicional || null
      if (municipioOrigem !== undefined) updateData.municipioOrigem = municipioOrigem || null
      if (municipioDestino !== undefined) updateData.municipioDestino = municipioDestino || null
      if (documentos !== undefined) updateData.documentos = documentos || null
      if (valores !== undefined) updateData.valores = valores || null

      const despachante = await prisma.despachante.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true,
              chassi: true,
              renavam: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      })

      res.json(despachante)
    } catch (error) {
      console.error('Erro ao atualizar despachante:', error)
      res.status(500).json({ error: 'Erro ao atualizar despachante' })
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params
      await prisma.despachante.delete({
        where: { id: parseInt(id) }
      })

      res.json({ message: 'Despachante excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir despachante:', error)
      res.status(500).json({ error: 'Erro ao excluir despachante' })
    }
  }
}

module.exports = new DespachanteController()
