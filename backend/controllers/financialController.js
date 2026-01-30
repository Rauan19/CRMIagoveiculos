const prisma = require('../models/prisma');

class FinancialController {
  async listTransactions(req, res) {
    try {
      const { operacao, type, status, startDate, endDate, mesReferencia, isDespesa } = req.query;
      
      const where = {};
      // Suportar tanto operacao quanto type (legado)
      if (operacao) where.operacao = operacao;
      else if (type) where.operacao = type === 'receber' ? 'receber' : 'pagar';
      if (status) where.status = status;
      if (mesReferencia) where.mesReferencia = mesReferencia;
      if (isDespesa !== undefined) where.isDespesa = isDespesa === 'true';
      if (startDate || endDate) {
        where.dataVencimento = {};
        if (startDate) where.dataVencimento.gte = new Date(startDate);
        if (endDate) where.dataVencimento.lte = new Date(endDate);
        // Também verificar dueDate para compatibilidade
        if (!where.dataVencimento.gte && !where.dataVencimento.lte) {
          where.dueDate = {};
          if (startDate) where.dueDate.gte = new Date(startDate);
          if (endDate) where.dueDate.lte = new Date(endDate);
        }
      }

      const transactions = await prisma.financialTransaction.findMany({
        where,
        include: {
          sale: {
            select: { 
              id: true,
              customer: {
                select: { name: true }
              }
            }
          },
          customer: {
            select: { id: true, name: true, cpf: true, phone: true }
          },
          categoriaFinanceira: {
            select: { id: true, nome: true, nivel: true, codigo: true }
          }
        },
        orderBy: { dataVencimento: 'desc' }
      });

      res.json(transactions);
    } catch (error) {
      console.error('Erro ao listar transações:', error);
      res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  async createTransaction(req, res) {
    try {
      const {
        operacao,
        type, // Legado
        posicaoEstoque,
        solicitadoPor,
        autorizadoPor,
        dataVencimento,
        dueDate, // Legado
        mesReferencia,
        numeroDocumento,
        valorTitulo,
        amount, // Legado
        customerId,
        categoriaFinanceiraId,
        description,
        observacoes,
        formaPagamento,
        isDespesa,
        recorrente,
        darBaixa,
        marcador,
        saleId,
        status,
        // Campos específicos para transferência
        dataTransferencia,
        contaOrigem,
        contaDestino,
        valorTransferencia
      } = req.body;

      // Validar campos obrigatórios
      const operacaoFinal = operacao || (type === 'receber' ? 'receber' : type === 'pagar' ? 'pagar' : 'pagar');
      
      if (operacaoFinal === 'transferencia') {
        // Validação específica para transferência
        if (!dataTransferencia || !contaOrigem || !contaDestino || !valorTransferencia) {
          return res.status(400).json({ 
            error: 'Campos obrigatórios para transferência: dataTransferencia, contaOrigem, contaDestino, valorTransferencia' 
          });
        }
      } else {
        // Validação para pagar/receber
        const valorFinal = valorTitulo || amount;
        const dataVencimentoFinal = dataVencimento || dueDate;
        if (!valorFinal || !description || !dataVencimentoFinal) {
          return res.status(400).json({ 
            error: 'Campos obrigatórios: operacao, valorTitulo, description, dataVencimento' 
          });
        }
      }

      // Validar operação válida
      if (!['receber', 'pagar', 'transferencia'].includes(operacaoFinal)) {
        return res.status(400).json({ 
          error: 'Operação inválida. Valores aceitos: receber, pagar, transferencia' 
        });
      }

      // Se darBaixa = true, definir paidDate e status como pago
      const paidDateValue = darBaixa ? new Date() : null;
      const statusFinal = darBaixa ? 'pago' : (status || 'pendente');

      const transactionData = {
        operacao: operacaoFinal,
        customerId: customerId ? parseInt(customerId) : null,
        categoriaFinanceiraId: categoriaFinanceiraId ? parseInt(categoriaFinanceiraId) : null,
        description: description || null,
        observacoes: observacoes || null,
        formaPagamento: formaPagamento || null,
        isDespesa: isDespesa || false,
        recorrente: recorrente || false,
        darBaixa: darBaixa || false,
        marcador: marcador || null,
        paidDate: paidDateValue,
        status: statusFinal,
        saleId: saleId ? parseInt(saleId) : null,
        // Campos legados para compatibilidade
        type: operacaoFinal,
      };

      if (operacaoFinal === 'transferencia') {
        // Campos específicos para transferência
        transactionData.dataTransferencia = new Date(dataTransferencia);
        transactionData.contaOrigem = contaOrigem || null;
        transactionData.contaDestino = contaDestino || null;
        transactionData.valorTransferencia = parseFloat(valorTransferencia);
        transactionData.amount = parseFloat(valorTransferencia); // Legado
      } else {
        // Campos normais para pagar/receber
        const valorFinal = valorTitulo || amount;
        const dataVencimentoFinal = dataVencimento || dueDate;
        transactionData.posicaoEstoque = posicaoEstoque ? parseInt(posicaoEstoque) : null;
        transactionData.solicitadoPor = solicitadoPor || null;
        transactionData.autorizadoPor = autorizadoPor || null;
        transactionData.dataVencimento = new Date(dataVencimentoFinal);
        transactionData.mesReferencia = mesReferencia || null;
        transactionData.numeroDocumento = numeroDocumento || null;
        transactionData.valorTitulo = parseFloat(valorFinal);
        transactionData.amount = parseFloat(valorFinal); // Legado
        transactionData.dueDate = new Date(dataVencimentoFinal); // Legado
      }

      const transaction = await prisma.financialTransaction.create({
        data: transactionData
      });

      res.status(201).json({ message: 'Movimentação criada com sucesso', transaction });
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
      res.status(500).json({ error: 'Erro ao criar movimentação' });
    }
  }

  async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const {
        operacao,
        type,
        posicaoEstoque,
        solicitadoPor,
        autorizadoPor,
        dataVencimento,
        dueDate,
        mesReferencia,
        numeroDocumento,
        valorTitulo,
        amount,
        customerId,
        categoriaFinanceiraId,
        description,
        observacoes,
        formaPagamento,
        isDespesa,
        recorrente,
        darBaixa,
        marcador,
        paidDate,
        status,
        // Campos específicos para transferência
        dataTransferencia,
        contaOrigem,
        contaDestino,
        valorTransferencia
      } = req.body;

      const updateData = {};
      if (operacao !== undefined) {
        // Validar operação válida
        if (!['receber', 'pagar', 'transferencia'].includes(operacao)) {
          return res.status(400).json({ 
            error: 'Operação inválida. Valores aceitos: receber, pagar, transferencia' 
          });
        }
        updateData.operacao = operacao;
        updateData.type = operacao; // Legado
      } else if (type !== undefined) {
        const operacaoFromType = type === 'receber' ? 'receber' : type === 'pagar' ? 'pagar' : 'pagar';
        updateData.operacao = operacaoFromType;
        updateData.type = type; // Legado
      }
      if (posicaoEstoque !== undefined) updateData.posicaoEstoque = posicaoEstoque ? parseInt(posicaoEstoque) : null;
      if (solicitadoPor !== undefined) updateData.solicitadoPor = solicitadoPor || null;
      if (autorizadoPor !== undefined) updateData.autorizadoPor = autorizadoPor || null;
      if (dataVencimento !== undefined) {
        updateData.dataVencimento = dataVencimento ? new Date(dataVencimento) : null;
        updateData.dueDate = updateData.dataVencimento; // Legado
      } else if (dueDate !== undefined) {
        updateData.dataVencimento = dueDate ? new Date(dueDate) : null;
        updateData.dueDate = updateData.dataVencimento; // Legado
      }
      if (mesReferencia !== undefined) updateData.mesReferencia = mesReferencia || null;
      if (numeroDocumento !== undefined) updateData.numeroDocumento = numeroDocumento || null;
      if (valorTitulo !== undefined) {
        updateData.valorTitulo = parseFloat(valorTitulo);
        updateData.amount = updateData.valorTitulo; // Legado
      } else if (amount !== undefined) {
        updateData.valorTitulo = parseFloat(amount);
        updateData.amount = updateData.valorTitulo; // Legado
      }
      if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null;
      if (categoriaFinanceiraId !== undefined) updateData.categoriaFinanceiraId = categoriaFinanceiraId ? parseInt(categoriaFinanceiraId) : null;
      if (description !== undefined) updateData.description = description;
      if (observacoes !== undefined) updateData.observacoes = observacoes || null;
      if (formaPagamento !== undefined) updateData.formaPagamento = formaPagamento || null;
      if (isDespesa !== undefined) updateData.isDespesa = isDespesa;
      if (recorrente !== undefined) updateData.recorrente = recorrente;
      if (darBaixa !== undefined) {
        updateData.darBaixa = darBaixa;
        if (darBaixa) {
          updateData.paidDate = new Date();
          updateData.status = 'pago';
        }
      }
      if (marcador !== undefined) updateData.marcador = marcador || null;
      if (paidDate !== undefined) updateData.paidDate = paidDate ? new Date(paidDate) : null;
      if (status !== undefined) updateData.status = status;
      // Campos específicos para transferência
      if (dataTransferencia !== undefined) updateData.dataTransferencia = dataTransferencia ? new Date(dataTransferencia) : null;
      if (contaOrigem !== undefined) updateData.contaOrigem = contaOrigem || null;
      if (contaDestino !== undefined) updateData.contaDestino = contaDestino || null;
      if (valorTransferencia !== undefined) updateData.valorTransferencia = valorTransferencia ? parseFloat(valorTransferencia) : null;

      const transaction = await prisma.financialTransaction.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Movimentação atualizada com sucesso', transaction });
    } catch (error) {
      console.error('Erro ao atualizar movimentação:', error);
      res.status(500).json({ error: 'Erro ao atualizar movimentação' });
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
        where: { 
          ...where, 
          OR: [
            { operacao: 'receber' },
            { type: 'receber' }
          ]
        },
        select: { valorTitulo: true, amount: true, status: true }
      });

      const payables = await prisma.financialTransaction.findMany({
        where: { 
          ...where, 
          OR: [
            { operacao: 'pagar' },
            { type: 'pagar' }
          ]
        },
        select: { valorTitulo: true, amount: true, status: true }
      });

      const transfers = await prisma.financialTransaction.findMany({
        where: { 
          ...where, 
          operacao: 'transferencia'
        },
        select: { valorTitulo: true, amount: true, status: true }
      });

      const totalReceber = receivables.reduce((sum, t) => sum + (t.valorTitulo || t.amount || 0), 0);
      const totalPagar = payables.reduce((sum, t) => sum + (t.valorTitulo || t.amount || 0), 0);
      const recebido = receivables
        .filter(t => t.status === 'pago')
        .reduce((sum, t) => sum + (t.valorTitulo || t.amount || 0), 0);
      const pago = payables
        .filter(t => t.status === 'pago')
        .reduce((sum, t) => sum + (t.valorTitulo || t.amount || 0), 0);

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

  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      await prisma.financialTransaction.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Transação deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      res.status(500).json({ error: 'Erro ao deletar transação' });
    }
  }
}

module.exports = new FinancialController();

