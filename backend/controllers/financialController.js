const prisma = require('../models/prisma');

class FinancialController {
  async listTransactions(req, res) {
    try {
      const { type, status, startDate, endDate } = req.query;
      
      const where = {};
      if (type) where.type = type;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = new Date(startDate);
        if (endDate) where.dueDate.lte = new Date(endDate);
      }

      const transactions = await prisma.financialTransaction.findMany({
        where,
        include: {
          sale: {
            select: { id: true, customer: { select: { name: true } } }
          }
        },
        orderBy: { dueDate: 'desc' }
      });

      res.json(transactions);
    } catch (error) {
      console.error('Erro ao listar transações:', error);
      res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  async createTransaction(req, res) {
    try {
      const { type, amount, description, dueDate, saleId, status } = req.body;

      if (!type || !amount || !description || !dueDate) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: type, amount, description, dueDate' 
        });
      }

      const transaction = await prisma.financialTransaction.create({
        data: {
          type,
          amount: parseFloat(amount),
          description,
          dueDate: new Date(dueDate),
          saleId: saleId ? parseInt(saleId) : null,
          status: status || 'pendente'
        }
      });

      res.status(201).json({ message: 'Transação criada com sucesso', transaction });
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      res.status(500).json({ error: 'Erro ao criar transação' });
    }
  }

  async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const { type, amount, description, dueDate, paidDate, status } = req.body;

      const updateData = {};
      if (type) updateData.type = type;
      if (amount) updateData.amount = parseFloat(amount);
      if (description) updateData.description = description;
      if (dueDate) updateData.dueDate = new Date(dueDate);
      if (paidDate !== undefined) updateData.paidDate = paidDate ? new Date(paidDate) : null;
      if (status) updateData.status = status;

      const transaction = await prisma.financialTransaction.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Transação atualizada com sucesso', transaction });
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
  }

  async getDashboard(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = new Date(startDate);
        if (endDate) where.dueDate.lte = new Date(endDate);
      }

      const receivables = await prisma.financialTransaction.findMany({
        where: { ...where, type: 'receber' },
        select: { amount: true, status: true }
      });

      const payables = await prisma.financialTransaction.findMany({
        where: { ...where, type: 'pagar' },
        select: { amount: true, status: true }
      });

      const totalReceber = receivables.reduce((sum, t) => sum + t.amount, 0);
      const totalPagar = payables.reduce((sum, t) => sum + t.amount, 0);
      const recebido = receivables
        .filter(t => t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);
      const pago = payables
        .filter(t => t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);

      res.json({
        receber: {
          total: totalReceber,
          recebido,
          pendente: totalReceber - recebido
        },
        pagar: {
          total: totalPagar,
          pago,
          pendente: totalPagar - pago
        },
        saldo: recebido - pago
      });
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
  }
}

module.exports = new FinancialController();

