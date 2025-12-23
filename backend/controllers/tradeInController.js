const prisma = require('../models/prisma');

class TradeInController {
  async list(req, res) {
    try {
      const { status, customerId } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (customerId) where.customerId = parseInt(customerId);

      const tradeIns = await prisma.tradeIn.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          sale: {
            select: { id: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(tradeIns);
    } catch (error) {
      console.error('Erro ao listar trade-ins:', error);
      res.status(500).json({ error: 'Erro ao buscar trade-ins' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const tradeIn = await prisma.tradeIn.findUnique({
        where: { id: parseInt(id) },
        include: {
          customer: true,
          sale: {
            include: {
              vehicle: true,
              seller: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (!tradeIn) {
        return res.status(404).json({ error: 'Trade-in não encontrado' });
      }

      res.json(tradeIn);
    } catch (error) {
      console.error('Erro ao buscar trade-in:', error);
      res.status(500).json({ error: 'Erro ao buscar trade-in' });
    }
  }

  async create(req, res) {
    try {
      const { customerId, brand, model, year, km, valueFipe, valueOffer, photos, status } = req.body;

      if (!customerId || !brand || !model || !year || !valueFipe || !valueOffer) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: customerId, brand, model, year, valueFipe, valueOffer' 
        });
      }

      const tradeIn = await prisma.tradeIn.create({
        data: {
          customerId: parseInt(customerId),
          brand,
          model,
          year: parseInt(year),
          km: km ? parseInt(km) : null,
          valueFipe: parseFloat(valueFipe),
          valueOffer: parseFloat(valueOffer),
          photos: photos ? JSON.stringify(photos) : null,
          status: status || 'pendente'
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          }
        }
      });

      res.status(201).json({ message: 'Trade-in criado com sucesso', tradeIn });
    } catch (error) {
      console.error('Erro ao criar trade-in:', error);
      res.status(500).json({ error: 'Erro ao criar trade-in' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { brand, model, year, km, valueFipe, valueOffer, photos, status } = req.body;

      const updateData = {};
      if (brand) updateData.brand = brand;
      if (model) updateData.model = model;
      if (year) updateData.year = parseInt(year);
      if (km !== undefined) updateData.km = km ? parseInt(km) : null;
      if (valueFipe) updateData.valueFipe = parseFloat(valueFipe);
      if (valueOffer) updateData.valueOffer = parseFloat(valueOffer);
      if (photos !== undefined) updateData.photos = photos ? JSON.stringify(photos) : null;
      if (status) updateData.status = status;

      const tradeIn = await prisma.tradeIn.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Trade-in atualizado com sucesso', tradeIn });
    } catch (error) {
      console.error('Erro ao atualizar trade-in:', error);
      res.status(500).json({ error: 'Erro ao atualizar trade-in' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.tradeIn.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Trade-in deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar trade-in:', error);
      res.status(500).json({ error: 'Erro ao deletar trade-in' });
    }
  }
}

module.exports = new TradeInController();

