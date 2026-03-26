const prisma = require('../models/prisma');

/**
 * Lista linhas de comissão a partir de vendas com `commission` preenchida.
 * Query: quick=current|last|prev, period=MM/YYYY, seller=nome (parcial)
 */
async function list(req, res) {
  try {
    const { quick, period, seller } = req.query;
    const now = new Date();

    let start;
    let end;

    if (period && /^\d{2}\/\d{4}$/.test(String(period))) {
      const [mm, yyyy] = String(period).split('/').map((x) => parseInt(x, 10));
      start = new Date(yyyy, mm - 1, 1, 0, 0, 0, 0);
      end = new Date(yyyy, mm, 0, 23, 59, 59, 999);
    } else if (quick === 'last') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (quick === 'prev') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else {
      // current ou sem filtro (default: mês atual — igual ao botão "Mês atual" na UI)
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const where = {
      commission: { not: null },
      date: { gte: start, lte: end },
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    let rows = sales.map((s) => ({
      id: s.id,
      period: `${String(s.date.getMonth() + 1).padStart(2, '0')}/${s.date.getFullYear()}`,
      seller: s.seller?.name || '',
      saleCommission: s.commission != null ? Number(s.commission) : 0,
      financingCommission: 0,
    }));

    if (seller && String(seller).trim()) {
      const q = String(seller).trim().toLowerCase();
      rows = rows.filter((r) => r.seller.toLowerCase().includes(q));
    }

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro ao buscar comissões' });
  }
}

module.exports = { list };
