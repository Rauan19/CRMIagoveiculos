const prisma = require('../models/prisma');

class SaleController {
  async list(req, res) {
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
            select: { id: true, name: true, phone: true, cpf: true }
          },
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, plate: true }
          },
          tradeIn: {
            select: { id: true, brand: true, model: true, valueOffer: true }
          },
          seller: {
            select: { id: true, name: true }
          },
          paymentMethods: true // Incluir formas de pagamento
        },
        orderBy: { date: 'desc' }
      });

      res.json(sales);
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
  }

  async getById(req, res) {
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
          },
          paymentMethods: true // Incluir formas de pagamento
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
  }

  async create(req, res) {
    try {
      const { 
        customerId, 
        vehicleId, 
        tradeInId, 
        sellerId, 
        salePrice,
        purchasePrice,
        entryValue,
        entryType,
        entryVehicleValue,
        entryAdditionalValue,
        entryCardInstallments,
        remainingValue,
        paymentMethod,
        paymentInstallments,
        paymentInstallmentValue,
        financedValue,
        financingBank,
        commission,
        contractClauses,
        notes,
        saleType,
        transferStatus,
        transferNotes,
        transferenciaValorEmbutido,
        transferenciaPagoFormasPagamento,
        saleChannel,
        saleChannelNotes,
        internalNotes,
        status,
        paymentMethods // Array de múltiplas formas de pagamento
      } = req.body;

      if (!customerId || !vehicleId || !sellerId) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: customerId, vehicleId, sellerId' 
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

      // Preço de venda
      const finalSalePrice = (salePrice !== undefined && salePrice !== null && salePrice !== '') 
        ? parseFloat(salePrice) 
        : null;
      
      // Calcular preço de compra (usa o cost do veículo se não informado)
      const finalPurchasePrice = (purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '') 
        ? parseFloat(purchasePrice) 
        : (vehicle.cost || null);
      
      // Calcular lucro (só se tiver ambos os valores)
      const profit = (finalSalePrice && finalPurchasePrice) 
        ? finalSalePrice - finalPurchasePrice 
        : null;

      // Criar venda
      const sale = await prisma.sale.create({
        data: {
          customerId: parseInt(customerId),
          vehicleId: parseInt(vehicleId),
          tradeInId: tradeInId ? parseInt(tradeInId) : null,
          sellerId: parseInt(sellerId),
          salePrice: finalSalePrice || null, // Se não tiver preço de venda, salva como null
          purchasePrice: finalPurchasePrice,
          profit: profit,
          entryValue: entryValue ? parseFloat(entryValue) : null,
          entryType: entryType || null,
          entryVehicleValue: entryVehicleValue ? parseFloat(entryVehicleValue) : null,
          entryAdditionalValue: entryAdditionalValue ? parseFloat(entryAdditionalValue) : null,
          entryCardInstallments: entryCardInstallments ? parseInt(entryCardInstallments) : null,
          remainingValue: remainingValue ? parseFloat(remainingValue) : null,
          paymentMethod: paymentMethod || null,
          paymentInstallments: paymentInstallments ? parseInt(paymentInstallments) : null,
          paymentInstallmentValue: paymentInstallmentValue ? parseFloat(paymentInstallmentValue) : null,
          financedValue: financedValue ? parseFloat(financedValue) : null,
          financingBank: financingBank || null,
          commission: commission ? parseFloat(commission) : null,
          contractClauses: contractClauses || null,
          notes: notes || null,
          saleType: saleType || null,
          transferStatus: transferStatus || null,
          transferNotes: transferNotes || null,
          transferenciaValorEmbutido: transferenciaValorEmbutido != null ? parseFloat(transferenciaValorEmbutido) : null,
          transferenciaPagoFormasPagamento: transferenciaPagoFormasPagamento && Array.isArray(transferenciaPagoFormasPagamento) ? transferenciaPagoFormasPagamento : null,
          saleChannel: saleChannel || null,
          saleChannelNotes: saleChannelNotes || null,
          internalNotes: internalNotes || null,
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

      // Criar múltiplas formas de pagamento se fornecidas
      if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
        const paymentMethodsData = paymentMethods.map((pm) => ({
          saleId: sale.id,
          date: pm.date ? new Date(pm.date) : new Date(),
          type: pm.type,
          value: parseFloat(pm.value) || 0,
          valorFinanciado: pm.valorFinanciado ? parseFloat(pm.valorFinanciado) : null,
          quantidadeParcelas: pm.quantidadeParcelas ? parseInt(pm.quantidadeParcelas) : null,
          frequencia15Dias: pm.frequencia15Dias || false,
          manterDataFixa: pm.manterDataFixa || false,
          valorParcela: pm.valorParcela ? parseFloat(pm.valorParcela) : null,
          numeroPrimeiroDoc: pm.numeroPrimeiroDoc || null,
          numeroDocumento: pm.numeroDocumento || null,
          descricao: pm.descricao || null,
          avalista: pm.avalista || null,
          avalistaAdicional: pm.avalistaAdicional || null,
          formaPagamentoFinanciamentoProprio: pm.formaPagamentoFinanciamentoProprio || null,
          codigoAutorizacao: pm.codigoAutorizacao || null,
          recebimentoLoja: pm.recebimentoLoja || null,
          nomeConsorcio: pm.nomeConsorcio || null,
          bancoFinanceira: pm.bancoFinanceira || null,
          agencia: pm.agencia || null,
          conta: pm.conta || null,
          numeroCheque: pm.numeroCheque || null,
          emNomeDe: pm.emNomeDe || null,
          tipoRetorno: pm.tipoRetorno || null,
          retorno: pm.retorno != null ? parseFloat(pm.retorno) : null,
          tac: pm.tac != null ? parseFloat(pm.tac) : null,
          plus: pm.plus != null ? parseFloat(pm.plus) : null,
          tif: pm.tif != null ? parseFloat(pm.tif) : null,
          taxaIntermediacaoFinanciamento: pm.taxaIntermediacaoFinanciamento != null ? parseFloat(pm.taxaIntermediacaoFinanciamento) : null,
          parcelasDetalhe: pm.parcelasDetalhe && Array.isArray(pm.parcelasDetalhe) ? pm.parcelasDetalhe : null,
          trocoData: pm.trocoData ? new Date(pm.trocoData) : null,
          trocoDescricao: pm.trocoDescricao || null,
          trocoValorTotal: pm.trocoValorTotal != null ? parseFloat(pm.trocoValorTotal) : null,
          veiculoTrocaId: pm.veiculoTrocaId ? parseInt(pm.veiculoTrocaId) : null,
        }));

        await prisma.salePaymentMethod.createMany({
          data: paymentMethodsData
        });
      }

      // Buscar a venda com as formas de pagamento
      const saleWithPayments = await prisma.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          vehicle: true,
          tradeIn: true,
          seller: {
            select: { id: true, name: true }
          },
          paymentMethods: true
        }
      });

      res.status(201).json({ message: 'Venda criada com sucesso', sale: saleWithPayments });
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      res.status(500).json({ error: 'Erro ao criar venda' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        salePrice,
        purchasePrice,
        entryValue,
        entryType,
        entryVehicleValue,
        entryAdditionalValue,
        entryCardInstallments,
        remainingValue,
        paymentMethod,
        paymentInstallments,
        paymentInstallmentValue,
        financedValue,
        financingBank,
        commission,
        contractUrl,
        contractClauses,
        notes,
        saleType,
        transferStatus,
        transferNotes,
        transferenciaValorEmbutido,
        transferenciaPagoFormasPagamento,
        saleChannel,
        saleChannelNotes,
        internalNotes,
        status
      } = req.body;

      const updateData = {};
      
      // Buscar venda atual para calcular lucro
      const currentSale = await prisma.sale.findUnique({
        where: { id: parseInt(id) },
        include: { vehicle: true }
      });

      if (salePrice !== undefined) updateData.salePrice = parseFloat(salePrice);
      if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
      
      // Recalcular lucro se preço de venda ou compra mudou
      const finalSalePrice = salePrice !== undefined ? parseFloat(salePrice) : currentSale.salePrice;
      const finalPurchasePrice = purchasePrice !== undefined ? parseFloat(purchasePrice) : (currentSale.purchasePrice || currentSale.vehicle.cost);
      updateData.profit = finalSalePrice - finalPurchasePrice;

      if (entryValue !== undefined) updateData.entryValue = entryValue ? parseFloat(entryValue) : null;
      if (entryType !== undefined) updateData.entryType = entryType || null;
      if (entryVehicleValue !== undefined) updateData.entryVehicleValue = entryVehicleValue ? parseFloat(entryVehicleValue) : null;
      if (entryAdditionalValue !== undefined) updateData.entryAdditionalValue = entryAdditionalValue ? parseFloat(entryAdditionalValue) : null;
      if (entryCardInstallments !== undefined) updateData.entryCardInstallments = entryCardInstallments ? parseInt(entryCardInstallments) : null;
      if (remainingValue !== undefined) updateData.remainingValue = remainingValue ? parseFloat(remainingValue) : null;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || null;
      if (paymentInstallments !== undefined) updateData.paymentInstallments = paymentInstallments ? parseInt(paymentInstallments) : null;
      if (paymentInstallmentValue !== undefined) updateData.paymentInstallmentValue = paymentInstallmentValue ? parseFloat(paymentInstallmentValue) : null;
      if (financedValue !== undefined) updateData.financedValue = financedValue ? parseFloat(financedValue) : null;
      if (financingBank !== undefined) updateData.financingBank = financingBank || null;
      if (commission !== undefined) updateData.commission = commission ? parseFloat(commission) : null;
      if (contractUrl !== undefined) updateData.contractUrl = contractUrl || null;
      if (contractClauses !== undefined) updateData.contractClauses = contractClauses || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (saleType !== undefined) updateData.saleType = saleType || null;
      if (transferStatus !== undefined) updateData.transferStatus = transferStatus || null;
      if (transferNotes !== undefined) updateData.transferNotes = transferNotes || null;
      if (transferenciaValorEmbutido !== undefined) updateData.transferenciaValorEmbutido = transferenciaValorEmbutido != null ? parseFloat(transferenciaValorEmbutido) : null;
      if (transferenciaPagoFormasPagamento !== undefined) updateData.transferenciaPagoFormasPagamento = transferenciaPagoFormasPagamento && Array.isArray(transferenciaPagoFormasPagamento) ? transferenciaPagoFormasPagamento : null;
      if (saleChannel !== undefined) updateData.saleChannel = saleChannel || null;
      if (saleChannelNotes !== undefined) updateData.saleChannelNotes = saleChannelNotes || null;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes || null;
      if (status) updateData.status = status;

      const sale = await prisma.sale.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
          tradeIn: true,
          seller: {
            select: { id: true, name: true }
          },
          paymentMethods: true // Incluir formas de pagamento
        }
      });

      // Atualizar formas de pagamento se fornecidas
      if (req.body.paymentMethods !== undefined && Array.isArray(req.body.paymentMethods)) {
        // Deletar formas de pagamento existentes
        await prisma.salePaymentMethod.deleteMany({
          where: { saleId: parseInt(id) }
        });

        // Criar novas formas de pagamento
        if (req.body.paymentMethods.length > 0) {
          const paymentMethodsData = req.body.paymentMethods.map((pm) => ({
            saleId: parseInt(id),
            date: pm.date ? new Date(pm.date) : new Date(),
            type: pm.type,
            value: parseFloat(pm.value) || 0,
            valorFinanciado: pm.valorFinanciado ? parseFloat(pm.valorFinanciado) : null,
            quantidadeParcelas: pm.quantidadeParcelas ? parseInt(pm.quantidadeParcelas) : null,
            frequencia15Dias: pm.frequencia15Dias || false,
            manterDataFixa: pm.manterDataFixa || false,
            valorParcela: pm.valorParcela ? parseFloat(pm.valorParcela) : null,
            numeroPrimeiroDoc: pm.numeroPrimeiroDoc || null,
            numeroDocumento: pm.numeroDocumento || null,
            descricao: pm.descricao || null,
            avalista: pm.avalista || null,
            avalistaAdicional: pm.avalistaAdicional || null,
            formaPagamentoFinanciamentoProprio: pm.formaPagamentoFinanciamentoProprio || null,
            trocoData: pm.trocoData ? new Date(pm.trocoData) : null,
            trocoDescricao: pm.trocoDescricao || null,
            trocoValorTotal: pm.trocoValorTotal ? parseFloat(pm.trocoValorTotal) : null,
            veiculoTrocaId: pm.veiculoTrocaId ? parseInt(pm.veiculoTrocaId) : null,
            codigoAutorizacao: pm.codigoAutorizacao || null,
            recebimentoLoja: pm.recebimentoLoja || null,
            nomeConsorcio: pm.nomeConsorcio || null,
            bancoFinanceira: pm.bancoFinanceira || null,
            agencia: pm.agencia || null,
            conta: pm.conta || null,
            numeroCheque: pm.numeroCheque || null,
            emNomeDe: pm.emNomeDe || null,
            tipoRetorno: pm.tipoRetorno || null,
            retorno: pm.retorno != null ? parseFloat(pm.retorno) : null,
            tac: pm.tac != null ? parseFloat(pm.tac) : null,
            plus: pm.plus != null ? parseFloat(pm.plus) : null,
            tif: pm.tif != null ? parseFloat(pm.tif) : null,
            taxaIntermediacaoFinanciamento: pm.taxaIntermediacaoFinanciamento != null ? parseFloat(pm.taxaIntermediacaoFinanciamento) : null,
            parcelasDetalhe: pm.parcelasDetalhe && Array.isArray(pm.parcelasDetalhe) ? pm.parcelasDetalhe : null,
          }));

          await prisma.salePaymentMethod.createMany({
            data: paymentMethodsData
          });
        }

        // Buscar venda atualizada com formas de pagamento
        const updatedSale = await prisma.sale.findUnique({
          where: { id: parseInt(id) },
          include: {
            customer: true,
            vehicle: true,
            tradeIn: true,
            seller: {
              select: { id: true, name: true }
            },
            paymentMethods: true
          }
        });

        return res.json({ message: 'Venda atualizada com sucesso', sale: updatedSale });
      }

      res.json({ message: 'Venda atualizada com sucesso', sale });
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      res.status(500).json({ error: 'Erro ao atualizar venda' });
    }
  }

  async delete(req, res) {
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
  }
}

module.exports = new SaleController();

