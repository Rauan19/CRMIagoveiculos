const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Listar todas as vendas
router.get('/', async (req, res) => {
  try {
    const { status, sellerId, customerId, startDate, endDate } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = parseInt(sellerId);
    if (customerId) where.customerId = parseInt(customerId);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        vehicle: {
          select: { id: true, brand: true, model: true, year: true }
        },
        tradeIn: {
          select: { id: true, brand: true, model: true, valueOffer: true }
        },
        seller: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(sales);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

// Buscar venda por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        vehicle: true,
        tradeIn: true,
        seller: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

// Criar venda
router.post('/', async (req, res) => {
  try {
    const { 
      customerId, 
      vehicleId, 
      tradeInId, 
      sellerId, 
      salePrice, 
      entryCash, 
      financedValue, 
      commission,
      status 
    } = req.body;

    if (!customerId || !vehicleId || !sellerId || !salePrice) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: customerId, vehicleId, sellerId, salePrice' 
      });
    }

    // Verificar se veículo está disponível
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId) }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    if (vehicle.status !== 'disponivel' && vehicle.status !== 'reservado') {
      return res.status(400).json({ error: 'Veículo não está disponível para venda' });
    }

    // Criar venda
    const sale = await prisma.sale.create({
      data: {
        customerId: parseInt(customerId),
        vehicleId: parseInt(vehicleId),
        tradeInId: tradeInId ? parseInt(tradeInId) : null,
        sellerId: parseInt(sellerId),
        salePrice: parseFloat(salePrice),
        entryCash: entryCash ? parseFloat(entryCash) : null,
        financedValue: financedValue ? parseFloat(financedValue) : null,
        commission: commission ? parseFloat(commission) : null,
        status: status || 'em_andamento'
      },
      include: {
        customer: true,
        vehicle: true,
        tradeIn: true,
        seller: {
          select: { id: true, name: true }
        }
      }
    });

    // Atualizar status do veículo
    await prisma.vehicle.update({
      where: { id: parseInt(vehicleId) },
      data: { status: 'vendido' }
    });

    // Se tiver trade-in, atualizar status
    if (tradeInId) {
      await prisma.tradeIn.update({
        where: { id: parseInt(tradeInId) },
        data: { status: 'aceito' }
      });
    }

    res.status(201).json({ message: 'Venda criada com sucesso', sale });
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

// Atualizar venda
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      salePrice, 
      entryCash, 
      financedValue, 
      commission,
      status,
      contractUrl 
    } = req.body;

    const updateData = {};
    if (salePrice) updateData.salePrice = parseFloat(salePrice);
    if (entryCash !== undefined) updateData.entryCash = entryCash ? parseFloat(entryCash) : null;
    if (financedValue !== undefined) updateData.financedValue = financedValue ? parseFloat(financedValue) : null;
    if (commission !== undefined) updateData.commission = commission ? parseFloat(commission) : null;
    if (status) updateData.status = status;
    if (contractUrl) updateData.contractUrl = contractUrl;

    const sale = await prisma.sale.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        tradeIn: true,
        seller: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ message: 'Venda atualizada com sucesso', sale });
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

// Deletar venda
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: { vehicle: true }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    // Reverter status do veículo
    await prisma.vehicle.update({
      where: { id: sale.vehicleId },
      data: { status: 'disponivel' }
    });

    await prisma.sale.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Venda deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({ error: 'Erro ao deletar venda' });
  }
});

module.exports = router;


