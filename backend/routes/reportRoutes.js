const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Relatório de vendas por período
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, sellerId } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (sellerId) where.sellerId = parseInt(sellerId);

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true }
        },
        vehicle: {
          select: { id: true, brand: true, model: true, year: true, cost: true }
        },
        seller: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    const totalVendas = sales.length;
    const valorTotal = sales.reduce((sum, s) => sum + s.salePrice, 0);
    const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

    // Por vendedor
    const porVendedor = {};
    sales.forEach(sale => {
      const sellerName = sale.seller.name;
      if (!porVendedor[sellerName]) {
        porVendedor[sellerName] = { count: 0, total: 0 };
      }
      porVendedor[sellerName].count++;
      porVendedor[sellerName].total += sale.salePrice;
    });

    res.json({
      periodo: {
        startDate,
        endDate
      },
      resumo: {
        totalVendas,
        valorTotal,
        ticketMedio
      },
      vendas: sales,
      porVendedor
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório de lucratividade
router.get('/profitability', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        vehicle: true,
        seller: {
          select: { id: true, name: true }
        }
      }
    });

    const lucratividade = sales.map(sale => {
      const custo = sale.vehicle?.cost || 0;
      const lucro = sale.salePrice - custo;
      const margem = sale.salePrice > 0 ? ((lucro / sale.salePrice) * 100) : 0;

      return {
        saleId: sale.id,
        vehicle: `${sale.vehicle?.brand} ${sale.vehicle?.model} ${sale.vehicle?.year}`,
        custo: custo,
        venda: sale.salePrice,
        lucro: lucro,
        margem: margem.toFixed(2) + '%',
        vendedor: sale.seller.name,
        data: sale.date
      };
    });

    const totalLucro = lucratividade.reduce((sum, l) => sum + l.lucro, 0);
    const margemMedia = sales.length > 0 
      ? (lucratividade.reduce((sum, l) => sum + parseFloat(l.margem), 0) / sales.length).toFixed(2)
      : 0;

    res.json({
      resumo: {
        totalVendas: sales.length,
        totalLucro,
        margemMedia: margemMedia + '%'
      },
      detalhes: lucratividade
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de lucratividade:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório de veículos parados
router.get('/vehicles-stuck', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));

    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: 'disponivel',
        createdAt: {
          lte: dateLimit
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const totalValue = vehicles.reduce((sum, v) => sum + v.cost, 0);

    res.json({
      total: vehicles.length,
      valorTotal: totalValue,
      dias: parseInt(days),
      veiculos: vehicles.map(v => ({
        id: v.id,
        descricao: `${v.brand} ${v.model} ${v.year}`,
        custo: v.cost,
        preco: v.price,
        diasParado: Math.floor((new Date() - new Date(v.createdAt)) / (1000 * 60 * 60 * 24)),
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de veículos parados:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;


