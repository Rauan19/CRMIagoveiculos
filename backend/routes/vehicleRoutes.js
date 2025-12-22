const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Listar todos os veículos
router.get('/', async (req, res) => {
  try {
    const { status, search, brand, year } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (brand) where.brand = { contains: brand };
    if (year) where.year = parseInt(year);
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } }
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
});

// Buscar veículo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(id) },
      include: {
        sale: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true }
            },
            seller: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    res.status(500).json({ error: 'Erro ao buscar veículo' });
  }
});

// Criar veículo
router.post('/', async (req, res) => {
  try {
    const { brand, model, year, km, color, price, cost, photos, status } = req.body;

    if (!brand || !model || !year || !price || !cost) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: brand, model, year, price, cost' 
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        brand,
        model,
        year: parseInt(year),
        km: km ? parseInt(km) : null,
        color,
        price: parseFloat(price),
        cost: parseFloat(cost),
        photos: photos ? JSON.stringify(photos) : null,
        status: status || 'disponivel'
      }
    });

    res.status(201).json({ message: 'Veículo criado com sucesso', vehicle });
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    res.status(500).json({ error: 'Erro ao criar veículo' });
  }
});

// Atualizar veículo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, year, km, color, price, cost, photos, status } = req.body;

    const updateData = {};
    if (brand) updateData.brand = brand;
    if (model) updateData.model = model;
    if (year) updateData.year = parseInt(year);
    if (km !== undefined) updateData.km = km ? parseInt(km) : null;
    if (color) updateData.color = color;
    if (price) updateData.price = parseFloat(price);
    if (cost) updateData.cost = parseFloat(cost);
    if (photos !== undefined) updateData.photos = photos ? JSON.stringify(photos) : null;
    if (status) updateData.status = status;

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Veículo atualizado com sucesso', vehicle });
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    res.status(500).json({ error: 'Erro ao atualizar veículo' });
  }
});

// Deletar veículo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Veículo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar veículo:', error);
    res.status(500).json({ error: 'Erro ao deletar veículo' });
  }
});

// Estatísticas de estoque
router.get('/stats/stock', async (req, res) => {
  try {
    const total = await prisma.vehicle.count();
    const disponivel = await prisma.vehicle.count({ where: { status: 'disponivel' } });
    const reservado = await prisma.vehicle.count({ where: { status: 'reservado' } });
    const vendido = await prisma.vehicle.count({ where: { status: 'vendido' } });

    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'disponivel' },
      select: { cost: true }
    });

    const totalValue = vehicles.reduce((sum, v) => sum + v.cost, 0);

    res.json({
      total,
      disponivel,
      reservado,
      vendido,
      valorTotalEstoque: totalValue
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;

