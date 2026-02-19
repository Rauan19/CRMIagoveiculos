const prisma = require('../models/prisma');

class VehicleController {
  async uploadDocument(req, res) {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado. Use o campo "document" (PDF).' });
      }

      const vehicleId = parseInt(id);
      const exists = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true }
      });

      if (!exists) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          documentPdf: req.file.buffer,
          documentName: req.file.originalname || 'documento.pdf',
          documentMime: req.file.mimetype || 'application/pdf',
          documentUpdatedAt: new Date()
        },
        select: {
          id: true,
          documentName: true,
          documentMime: true,
          documentUpdatedAt: true
        }
      });

      res.json({ message: 'Documento anexado com sucesso', document: updated });
    } catch (error) {
      console.error('Erro ao anexar documento do veículo:', error);
      res.status(500).json({ error: 'Erro ao anexar documento do veículo' });
    }
  }

  async downloadDocument(req, res) {
    try {
      const { id } = req.params;
      const vehicleId = parseInt(id);

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: {
          id: true,
          documentPdf: true,
          documentName: true,
          documentMime: true
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      if (!vehicle.documentPdf) {
        return res.status(404).json({ error: 'Este veículo não possui documento anexado' });
      }

      const filename = vehicle.documentName || `documento-veiculo-${vehicle.id}.pdf`;
      const mime = vehicle.documentMime || 'application/pdf';

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
      return res.status(200).send(Buffer.from(vehicle.documentPdf));
    } catch (error) {
      console.error('Erro ao baixar documento do veículo:', error);
      res.status(500).json({ error: 'Erro ao baixar documento do veículo' });
    }
  }

  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const vehicleId = parseInt(id);

      const exists = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true }
      });

      if (!exists) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          documentPdf: null,
          documentName: null,
          documentMime: null,
          documentUpdatedAt: null
        }
      });

      res.json({ message: 'Documento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover documento do veículo:', error);
      res.status(500).json({ error: 'Erro ao remover documento do veículo' });
    }
  }

  async list(req, res) {
    try {
      const { status, search, brand, year } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (brand) where.brand = { contains: brand, mode: 'insensitive' };
      if (year) where.year = parseInt(year);
      if (search) {
        const term = search.trim()
        const termNoSpaces = term.replace(/\s/g, '')
        where.OR = [
          { brand: { contains: term, mode: 'insensitive' } },
          { model: { contains: term, mode: 'insensitive' } },
          ...(termNoSpaces.length >= 2 ? [{ plate: { contains: termNoSpaces, mode: 'insensitive' } }] : [])
        ]
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plate: true,
          km: true,
          color: true,
          price: true,
          cost: true,
          tableValue: true,
          expenseType: true,
          expenseValue: true,
          customerId: true,
          notes: true,
          photos: true,
          status: true,
          conditionStatus: true,
          createdAt: true,
          documentName: true,
          documentMime: true,
          documentUpdatedAt: true,
          posicao: true,
          dataEntrada: true,
          anoFabricacao: true,
          anoModelo: true,
          chassi: true,
          precoPromocional: true,
          canalEntrada: true,
          marcador1: true,
          customer: { select: { id: true, name: true, phone: true } },
          sale: { select: { id: true, date: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(
        vehicles.map(v => ({
          ...v,
          hasDocument: !!v.documentName,
          saleDate: v.sale?.date || null
        }))
      );
    } catch (error) {
      console.error('Erro ao listar veículos:', error);
      res.status(500).json({ error: 'Erro ao buscar veículos' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(id) },
        include: {
          parcelasQuitacao: true,
          debitos: true,
          pendencias: true,
          customer: {
            select: { id: true, name: true, phone: true, cpf: true }
          },
          sale: {
            select: {
              id: true,
              status: true,
              date: true,
              salePrice: true,
              purchasePrice: true,
              customer: { select: { id: true, name: true, phone: true } },
              seller: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      res.json({ ...vehicle, hasDocument: !!vehicle.documentName });
    } catch (error) {
      console.error('Erro ao buscar veículo:', error);
      res.status(500).json({ error: 'Erro ao buscar veículo' });
    }
  }

  async create(req, res) {
    try {
      const {
        brand, model, year, plate, km, color, price, cost, tableValue, expenseType, expenseValue,
        customerId, notes, photos, status,
        empresa, posicao, conditionStatus, renavam, cadastroOutrasLojas, especie, combustivel,
        modeloDenatran, modeloBase, portas, carroceria, anoFabricacao, anoModelo, motorizacao,
        cambio, chassi, chassiRemarcado, modeloFipe, cidadeEmplacamento, numeroCambio, hpCv,
        periciaCautelar, passageiros, blindado, origem, numeroMotor, corInterna, opcionais
      } = req.body;

      if (!brand || !model || !year) {
        return res.status(400).json({ error: 'Campos obrigatórios: brand, model, year' });
      }

      const vehicleCost = cost ? parseFloat(cost) : null;
      const vehicleExpense = expenseValue ? parseFloat(expenseValue) : null;
      const totalCost = vehicleCost ? (vehicleCost + (vehicleExpense || 0)) : null;

      const vehicle = await prisma.vehicle.create({
        data: {
          brand,
          model,
          year: parseInt(year),
          plate: plate || null,
          km: km ? parseInt(km) : null,
          color: color || null,
          price: price ? parseFloat(price) : null,
          cost: vehicleCost,
          tableValue: tableValue ? parseFloat(tableValue) : null,
          expenseType: expenseType || null,
          expenseValue: vehicleExpense,
          customerId: customerId ? parseInt(customerId) : null,
          notes: notes || null,
          photos: photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null,
          status: status || 'disponivel',
          empresa: empresa || 'Iago Veiculos Ltda',
          posicao: posicao != null ? parseInt(posicao) : null,
          conditionStatus: conditionStatus || null,
          renavam: renavam || null,
          cadastroOutrasLojas: !!cadastroOutrasLojas,
          especie: especie || null,
          combustivel: combustivel || null,
          modeloDenatran: modeloDenatran || null,
          modeloBase: modeloBase || null,
          portas: portas || null,
          carroceria: carroceria || null,
          anoFabricacao: anoFabricacao != null ? parseInt(anoFabricacao) : null,
          anoModelo: anoModelo != null ? parseInt(anoModelo) : null,
          motorizacao: motorizacao || null,
          cambio: cambio || null,
          chassi: chassi || null,
          chassiRemarcado: !!chassiRemarcado,
          modeloFipe: modeloFipe || null,
          cidadeEmplacamento: cidadeEmplacamento || null,
          numeroCambio: numeroCambio || null,
          hpCv: hpCv || null,
          periciaCautelar: periciaCautelar || null,
          passageiros: passageiros || null,
          blindado: blindado || null,
          origem: origem || null,
          numeroMotor: numeroMotor || null,
          corInterna: corInterna || null,
          opcionais: opcionais ? (typeof opcionais === 'string' ? opcionais : JSON.stringify(opcionais)) : null
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } }
        }
      });

      // Criar transação financeira de saída se houver custo
      if (totalCost && totalCost > 0) {
        await prisma.financialTransaction.create({
          data: {
            type: 'pagar',
            description: `Compra de veículo: ${brand} ${model} ${year}${plate ? ` - ${plate}` : ''}`,
            amount: totalCost,
            dueDate: new Date(), // Data atual se não especificado
            status: 'pendente'
          }
        });
      }

      res.status(201).json({ message: 'Veículo criado com sucesso', vehicle });
    } catch (error) {
      console.error('Erro ao criar veículo:', error);
      res.status(500).json({ error: 'Erro ao criar veículo' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        brand, model, year, plate, km, color, price, cost, tableValue, expenseType, expenseValue,
        customerId, notes, photos, status,
        empresa, posicao, conditionStatus, renavam, cadastroOutrasLojas, especie, combustivel,
        modeloDenatran, modeloBase, portas, carroceria, anoFabricacao, anoModelo, motorizacao,
        cambio, chassi, chassiRemarcado, modeloFipe, cidadeEmplacamento, numeroCambio, hpCv,
        periciaCautelar, passageiros, blindado, origem, numeroMotor, corInterna, opcionais,
        // Campos de entrada de estoque
        dataEntrada, canalEntrada, fornecedor, docEmNomeDe, intermediario,
        valorEntrada, valorQuitacao, valorDebitos, valorLiquido,
        precoPromocional, valorMinimoVenda,
        anoCRLV, valorIPVA, situacaoRecibo, vencimentoIPVA, valorLicencSeg,
        vencimentoGarantiaFabrica, documentoCRV,
        informacao1, marcador1, informacao2, marcador2,
        vendedorAngariador, observacaoEntrada, observacoesInternas
      } = req.body;

      const updateData = {};
      if (brand) updateData.brand = brand;
      if (model) updateData.model = model;
      if (year) updateData.year = parseInt(year);
      if (plate !== undefined) updateData.plate = plate || null;
      if (km !== undefined) updateData.km = km ? parseInt(km) : null;
      if (color !== undefined) updateData.color = color || null;
      if (price !== undefined) updateData.price = price ? parseFloat(price) : null;
      if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
      if (tableValue !== undefined) updateData.tableValue = tableValue ? parseFloat(tableValue) : null;
      if (expenseType !== undefined) updateData.expenseType = expenseType || null;
      if (expenseValue !== undefined) updateData.expenseValue = expenseValue ? parseFloat(expenseValue) : null;
      if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (photos !== undefined) updateData.photos = photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null;
      if (status) updateData.status = status;
      if (empresa !== undefined) updateData.empresa = empresa || null;
      if (posicao !== undefined) updateData.posicao = posicao != null ? parseInt(posicao) : null;
      if (conditionStatus !== undefined) updateData.conditionStatus = conditionStatus || null;
      if (renavam !== undefined) updateData.renavam = renavam || null;
      if (cadastroOutrasLojas !== undefined) updateData.cadastroOutrasLojas = !!cadastroOutrasLojas;
      if (especie !== undefined) updateData.especie = especie || null;
      if (combustivel !== undefined) updateData.combustivel = combustivel || null;
      if (modeloDenatran !== undefined) updateData.modeloDenatran = modeloDenatran || null;
      if (modeloBase !== undefined) updateData.modeloBase = modeloBase || null;
      if (portas !== undefined) updateData.portas = portas || null;
      if (carroceria !== undefined) updateData.carroceria = carroceria || null;
      if (anoFabricacao !== undefined) updateData.anoFabricacao = anoFabricacao != null ? parseInt(anoFabricacao) : null;
      if (anoModelo !== undefined) updateData.anoModelo = anoModelo != null ? parseInt(anoModelo) : null;
      if (motorizacao !== undefined) updateData.motorizacao = motorizacao || null;
      if (cambio !== undefined) updateData.cambio = cambio || null;
      if (chassi !== undefined) updateData.chassi = chassi || null;
      if (chassiRemarcado !== undefined) updateData.chassiRemarcado = !!chassiRemarcado;
      if (modeloFipe !== undefined) updateData.modeloFipe = modeloFipe || null;
      if (cidadeEmplacamento !== undefined) updateData.cidadeEmplacamento = cidadeEmplacamento || null;
      if (numeroCambio !== undefined) updateData.numeroCambio = numeroCambio || null;
      if (hpCv !== undefined) updateData.hpCv = hpCv || null;
      if (periciaCautelar !== undefined) updateData.periciaCautelar = periciaCautelar || null;
      if (passageiros !== undefined) updateData.passageiros = passageiros || null;
      if (blindado !== undefined) updateData.blindado = blindado || null;
      if (origem !== undefined) updateData.origem = origem || null;
      if (numeroMotor !== undefined) updateData.numeroMotor = numeroMotor || null;
      if (corInterna !== undefined) updateData.corInterna = corInterna || null;
      if (opcionais !== undefined) updateData.opcionais = opcionais ? (typeof opcionais === 'string' ? opcionais : JSON.stringify(opcionais)) : null;
      
      // Campos de entrada de estoque
      if (dataEntrada !== undefined) updateData.dataEntrada = dataEntrada ? new Date(dataEntrada) : null;
      if (canalEntrada !== undefined) updateData.canalEntrada = canalEntrada || null;
      if (fornecedor !== undefined) updateData.fornecedor = fornecedor || null;
      if (docEmNomeDe !== undefined) updateData.docEmNomeDe = docEmNomeDe || null;
      if (intermediario !== undefined) updateData.intermediario = intermediario || null;
      if (valorEntrada !== undefined) updateData.valorEntrada = valorEntrada ? parseFloat(valorEntrada) : null;
      if (valorQuitacao !== undefined) updateData.valorQuitacao = valorQuitacao ? parseFloat(valorQuitacao) : null;
      if (valorDebitos !== undefined) updateData.valorDebitos = valorDebitos ? parseFloat(valorDebitos) : null;
      if (valorLiquido !== undefined) updateData.valorLiquido = valorLiquido ? parseFloat(valorLiquido) : null;
      if (precoPromocional !== undefined) updateData.precoPromocional = precoPromocional ? parseFloat(precoPromocional) : null;
      if (valorMinimoVenda !== undefined) updateData.valorMinimoVenda = valorMinimoVenda ? parseFloat(valorMinimoVenda) : null;
      if (anoCRLV !== undefined) updateData.anoCRLV = anoCRLV ? parseInt(anoCRLV) : null;
      if (valorIPVA !== undefined) updateData.valorIPVA = valorIPVA ? parseFloat(valorIPVA) : null;
      if (situacaoRecibo !== undefined) updateData.situacaoRecibo = situacaoRecibo || null;
      if (vencimentoIPVA !== undefined) updateData.vencimentoIPVA = vencimentoIPVA ? new Date(vencimentoIPVA) : null;
      if (valorLicencSeg !== undefined) updateData.valorLicencSeg = valorLicencSeg ? parseFloat(valorLicencSeg) : null;
      if (vencimentoGarantiaFabrica !== undefined) updateData.vencimentoGarantiaFabrica = vencimentoGarantiaFabrica ? new Date(vencimentoGarantiaFabrica) : null;
      if (documentoCRV !== undefined) updateData.documentoCRV = documentoCRV || null;
      if (informacao1 !== undefined) updateData.informacao1 = informacao1 || null;
      if (marcador1 !== undefined) updateData.marcador1 = marcador1 || null;
      if (informacao2 !== undefined) updateData.informacao2 = informacao2 || null;
      if (marcador2 !== undefined) updateData.marcador2 = marcador2 || null;
      if (vendedorAngariador !== undefined) updateData.vendedorAngariador = vendedorAngariador || null;
      if (observacaoEntrada !== undefined) updateData.observacaoEntrada = observacaoEntrada || null;
      if (observacoesInternas !== undefined) updateData.observacoesInternas = observacoesInternas || null;

      const vehicle = await prisma.vehicle.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Veículo atualizado com sucesso', vehicle });
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      res.status(500).json({ error: 'Erro ao atualizar veículo' });
    }
  }

  async delete(req, res) {
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
  }

  async getStockStats(req, res) {
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
  }
}

module.exports = new VehicleController();

