const prisma = require('../models/prisma');

class FinancingController {
  async list(req, res) {
    try {
      const { startDate, endDate, company, received } = req.query;

      const where = {
        // Buscar pagamentos cujo tipo contenha 'fin' (financiamento, refinanciamento, etc.)
        type: { contains: 'fin', mode: 'insensitive' }
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      // Nota: campo 'descricao' ou 'recebimentoLoja' podem armazenar info da financeira
      if (company) {
        where.OR = [
          { descricao: { contains: company, mode: 'insensitive' } },
          { recebimentoLoja: { contains: company, mode: 'insensitive' } }
        ];
      }

      if (received === 'true') {
        where.recebimentoLoja = { not: null };
      } else if (received === 'false') {
        where.recebimentoLoja = null;
      }

      const payments = await prisma.salePaymentMethod.findMany({
        where,
        include: {
          sale: {
            include: {
              vehicle: {
                select: { brand: true, model: true, year: true }
              }
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      const rows = payments.map(p => ({
        id: p.id,
        date: p.date,
        type: p.type,
        vehicle: p.sale && p.sale.vehicle ? `${p.sale.vehicle.brand} ${p.sale.vehicle.model} ${p.sale.vehicle.year || ''}` : '',
        financialCompany: p.descricao || p.recebimentoLoja || '',
        financedValue: p.value || 0,
        returnValue: p.retorno || 0,
        tac: p.tac || 0,
        plus: p.plus || 0,
        returnType: p.tipoRetorno || '',
        position: p.numeroPrimeiroDoc || null,
        received: !!p.recebimentoLoja
      }));

      res.json(rows);
    } catch (error) {
      console.error('Erro ao listar financiamentos:', error);
      res.status(500).json({ error: 'Erro ao listar financiamentos' });
    }
  }
}

module.exports = new FinancingController();

