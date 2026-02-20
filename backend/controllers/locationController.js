const prisma = require('../models/prisma');

class LocationController {
  async create(req, res) {
    try {
      const { vehicleId, location, yard, expectedReturn, status, notes } = req.body;
      if (!location || String(location).trim() === '') {
        return res.status(400).json({ error: 'Campo "location" é obrigatório' });
      }

      const loc = await prisma.location.create({
        data: {
          vehicleId: vehicleId || null,
          location: location || '',
          yard: yard || null,
          expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
          status: status || null,
          notes: notes || null
        }
      });

      res.status(201).json(loc);
    } catch (error) {
      console.error('Erro ao criar location:', error);
      res.status(500).json({ error: 'Erro ao criar location' });
    }
  }

  async list(req, res) {
    try {
      const { vehicleId, location: locFilter, status } = req.query;
      const where = {};
      if (vehicleId) where.vehicleId = parseInt(vehicleId);
      if (locFilter) where.location = { contains: locFilter };
      if (status) where.status = status;

      const list = await prisma.location.findMany({
        where,
        include: {
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(list);
    } catch (error) {
      console.error('Erro ao listar locations:', error);
      res.status(500).json({ error: 'Erro ao listar locations' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const loc = await prisma.location.findUnique({
        where: { id: parseInt(id) },
        include: {
          vehicle: { select: { id: true, brand: true, model: true, year: true } }
        }
      });
      if (!loc) return res.status(404).json({ error: 'Location não encontrada' });
      res.json(loc);
    } catch (error) {
      console.error('Erro ao buscar location:', error);
      res.status(500).json({ error: 'Erro ao buscar location' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body;
      if (payload.expectedReturn) payload.expectedReturn = new Date(payload.expectedReturn);
      const updated = await prisma.location.update({
        where: { id: parseInt(id) },
        data: payload
      });
      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar location:', error);
      res.status(500).json({ error: 'Erro ao atualizar location' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const locationId = parseInt(id);
      const exists = await prisma.location.findUnique({ where: { id: locationId } });
      if (!exists) {
        return res.status(404).json({ error: 'Location não encontrada' });
      }

      await prisma.location.delete({ where: { id: locationId } });
      res.json({ message: 'Location removida' });
    } catch (error) {
      console.error('Erro ao deletar location:', error);
      // Prisma P2025 - record to delete does not exist
      if (error?.code === 'P2025') {
        return res.status(404).json({ error: 'Location não encontrada' });
      }
      res.status(500).json({ error: 'Erro ao deletar location' });
    }
  }
}

module.exports = new LocationController();

