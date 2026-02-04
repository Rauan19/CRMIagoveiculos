const prisma = require('../models/prisma');

// Limite de 10GB em bytes
const MAX_STORAGE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

// Função para calcular tamanho de base64 em bytes
function calculateBase64Size(base64String) {
  if (!base64String) return 0;
  // Remove o prefixo data:image/...;base64,
  const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
  // Base64 aumenta em ~33%, então dividimos por 1.33 para ter o tamanho real
  return (base64Data.length * 3) / 4;
}

// Função para calcular tamanho total de um array de imagens base64
function calculateTotalSize(photos) {
  if (!photos || !Array.isArray(photos)) return 0;
  return photos.reduce((total, photo) => total + calculateBase64Size(photo), 0);
}

// Função para obter tamanho total usado
async function getTotalUsedSize(excludeId = null) {
  const items = await prisma.estoque.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: { totalSize: true }
  });
  return items.reduce((total, item) => total + (item.totalSize || 0), 0);
}

class EstoqueController {
  async list(req, res) {
    try {
      const { search } = req.query;
      
      const where = {};
      if (search) {
        where.OR = [
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } }
        ];
      }

      const items = await prisma.estoque.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Calcular tamanho total usado
      const totalUsed = await getTotalUsedSize();
      const totalUsedGB = (totalUsed / (1024 * 1024 * 1024)).toFixed(2);
      const maxGB = (MAX_STORAGE_SIZE / (1024 * 1024 * 1024)).toFixed(2);
      const availableGB = ((MAX_STORAGE_SIZE - totalUsed) / (1024 * 1024 * 1024)).toFixed(2);

      res.json({
        items,
        storage: {
          totalUsed: totalUsed,
          totalUsedGB: parseFloat(totalUsedGB),
          maxSize: MAX_STORAGE_SIZE,
          maxGB: parseFloat(maxGB),
          available: MAX_STORAGE_SIZE - totalUsed,
          availableGB: parseFloat(availableGB),
          percentageUsed: ((totalUsed / MAX_STORAGE_SIZE) * 100).toFixed(2)
        }
      });
    } catch (error) {
      console.error('Erro ao listar estoque:', error);
      res.status(500).json({ error: 'Erro ao buscar estoque' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await prisma.estoque.findUnique({
        where: { id: parseInt(id) }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      res.json(item);
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      res.status(500).json({ error: 'Erro ao buscar item' });
    }
  }

  async create(req, res) {
    try {
      const { brand, model, year, plate, km, color, value, promotionValue, discount, notes, photos } = req.body;

      if (!brand || !model || !year) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: brand, model, year' 
        });
      }

      // Validar ano (Int 32-bit: máximo 2147483647; ano deve ser razoável)
      const yearNum = parseInt(year, 10);
      if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res.status(400).json({
          error: 'Ano inválido. Informe um ano entre 1900 e 2100.'
        });
      }

      // Validar km se informado (Int 32-bit: máximo 2147483647)
      const INT4_MAX = 2147483647;
      if (km != null && km !== '') {
        const kmNum = parseInt(km, 10);
        if (Number.isNaN(kmNum) || kmNum < 0 || kmNum > INT4_MAX) {
          return res.status(400).json({
            error: `Quilometragem inválida. Informe um valor entre 0 e ${INT4_MAX.toLocaleString('pt-BR')}.`
          });
        }
      }

      // Calcular tamanho das imagens
      let photosArray = [];
      let totalSize = 0;

      if (photos && Array.isArray(photos) && photos.length > 0) {
        photosArray = photos;
        totalSize = calculateTotalSize(photos);
        console.log(`[Estoque Create] Tamanho calculado: ${(totalSize / (1024 * 1024)).toFixed(2)}MB para ${photos.length} foto(s)`);
      }

      // Verificar se excede o limite
      const currentUsed = await getTotalUsedSize();
      console.log(`[Estoque Create] Armazenamento atual usado: ${(currentUsed / (1024 * 1024)).toFixed(2)}MB`);
      if (currentUsed + totalSize > MAX_STORAGE_SIZE) {
        const available = MAX_STORAGE_SIZE - currentUsed;
        const availableMB = (available / (1024 * 1024)).toFixed(2);
        const neededMB = (totalSize / (1024 * 1024)).toFixed(2);
        return res.status(400).json({ 
          error: `Limite de armazenamento excedido. Disponível: ${availableMB}MB, Necessário: ${neededMB}MB. Limite máximo: 10GB` 
        });
      }

      const kmSafe = (km != null && km !== '') ? parseInt(km, 10) : null;

      const item = await prisma.estoque.create({
        data: {
          brand,
          model,
          year: yearNum,
          plate: plate || null,
          km: kmSafe,
          color: color || null,
          value: value ? parseFloat(value) : null,
          promotionValue: promotionValue ? parseFloat(promotionValue) : null,
          discount: discount ? parseFloat(discount) : 0,
          notes: notes || null,
          photos: photosArray.length > 0 ? JSON.stringify(photosArray) : null,
          totalSize: totalSize
        }
      });

      console.log(`[Estoque Create] Item criado com ID ${item.id}, totalSize: ${item.totalSize} bytes (${(item.totalSize / (1024 * 1024)).toFixed(2)}MB)`);
      res.status(201).json(item);
    } catch (error) {
      console.error('Erro ao criar item:', error);
      res.status(500).json({ error: 'Erro ao criar item' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { brand, model, year, plate, km, color, value, promotionValue, discount, notes, photos } = req.body;

      const item = await prisma.estoque.findUnique({
        where: { id: parseInt(id) }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      // Calcular tamanho das novas imagens
      let photosArray = [];
      let totalSize = 0;

      if (photos !== undefined) {
        if (photos && Array.isArray(photos) && photos.length > 0) {
          photosArray = photos;
          totalSize = calculateTotalSize(photos);
          console.log(`[Estoque Update] Tamanho calculado: ${(totalSize / (1024 * 1024)).toFixed(2)}MB para ${photos.length} foto(s)`);
        }

        // Verificar se excede o limite (descontando o tamanho atual do item)
        const currentUsed = await getTotalUsedSize(parseInt(id));
        console.log(`[Estoque Update] Armazenamento atual usado (sem este item): ${(currentUsed / (1024 * 1024)).toFixed(2)}MB, tamanho anterior do item: ${((item.totalSize || 0) / (1024 * 1024)).toFixed(2)}MB`);
        if (currentUsed + totalSize > MAX_STORAGE_SIZE) {
          const available = MAX_STORAGE_SIZE - currentUsed;
          const availableMB = (available / (1024 * 1024)).toFixed(2);
          const neededMB = (totalSize / (1024 * 1024)).toFixed(2);
          return res.status(400).json({ 
            error: `Limite de armazenamento excedido. Disponível: ${availableMB}MB, Necessário: ${neededMB}MB. Limite máximo: 10GB` 
          });
        }
      } else {
        // Se photos não foi enviado, mantém o tamanho atual
        totalSize = item.totalSize || 0;
        if (item.photos) {
          try {
            photosArray = JSON.parse(item.photos);
          } catch {
            photosArray = [];
          }
        }
      }

      const INT4_MAX = 2147483647;
      if (year !== undefined) {
        const yearNum = parseInt(year, 10);
        if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
          return res.status(400).json({ error: 'Ano inválido. Informe um ano entre 1900 e 2100.' });
        }
      }
      if (km !== undefined && km != null && km !== '') {
        const kmNum = parseInt(km, 10);
        if (Number.isNaN(kmNum) || kmNum < 0 || kmNum > INT4_MAX) {
          return res.status(400).json({
            error: `Quilometragem inválida. Informe um valor entre 0 e ${INT4_MAX.toLocaleString('pt-BR')}.`
          });
        }
      }

      const updateData = {};
      if (brand !== undefined) updateData.brand = brand;
      if (model !== undefined) updateData.model = model;
      if (year !== undefined) updateData.year = parseInt(year, 10);
      if (plate !== undefined) updateData.plate = plate || null;
      if (km !== undefined) updateData.km = (km != null && km !== '') ? parseInt(km, 10) : null;
      if (color !== undefined) updateData.color = color || null;
      if (value !== undefined) updateData.value = value ? parseFloat(value) : null;
      if (promotionValue !== undefined) updateData.promotionValue = promotionValue ? parseFloat(promotionValue) : null;
      if (discount !== undefined) updateData.discount = discount ? parseFloat(discount) : 0;
      if (notes !== undefined) updateData.notes = notes || null;
      if (photos !== undefined) {
        updateData.photos = photosArray.length > 0 ? JSON.stringify(photosArray) : null;
        updateData.totalSize = totalSize;
      }

      const updatedItem = await prisma.estoque.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      if (photos !== undefined) {
        console.log(`[Estoque Update] Item ${id} atualizado, novo totalSize: ${updatedItem.totalSize} bytes (${(updatedItem.totalSize / (1024 * 1024)).toFixed(2)}MB)`);
      }

      res.json(updatedItem);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      res.status(500).json({ error: 'Erro ao atualizar item' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const item = await prisma.estoque.findUnique({
        where: { id: parseInt(id) }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      const deletedItem = await prisma.estoque.delete({
        where: { id: parseInt(id) }
      });

      console.log(`[Estoque Delete] Item ${id} deletado, totalSize removido: ${deletedItem.totalSize || 0} bytes (${((deletedItem.totalSize || 0) / (1024 * 1024)).toFixed(2)}MB)`);
      const newTotalUsed = await getTotalUsedSize();
      console.log(`[Estoque Delete] Novo armazenamento total usado: ${(newTotalUsed / (1024 * 1024)).toFixed(2)}MB`);

      res.json({ message: 'Item deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      res.status(500).json({ error: 'Erro ao deletar item' });
    }
  }

  async getStorageInfo(req, res) {
    try {
      const totalUsed = await getTotalUsedSize();
      const totalUsedGB = (totalUsed / (1024 * 1024 * 1024)).toFixed(2);
      const maxGB = (MAX_STORAGE_SIZE / (1024 * 1024 * 1024)).toFixed(2);
      const availableGB = ((MAX_STORAGE_SIZE - totalUsed) / (1024 * 1024 * 1024)).toFixed(2);

      res.json({
        totalUsed: totalUsed,
        totalUsedGB: parseFloat(totalUsedGB),
        maxSize: MAX_STORAGE_SIZE,
        maxGB: parseFloat(maxGB),
        available: MAX_STORAGE_SIZE - totalUsed,
        availableGB: parseFloat(availableGB),
        percentageUsed: ((totalUsed / MAX_STORAGE_SIZE) * 100).toFixed(2)
      });
    } catch (error) {
      console.error('Erro ao buscar informações de armazenamento:', error);
      res.status(500).json({ error: 'Erro ao buscar informações de armazenamento' });
    }
  }

  async getVehicleOptions(req, res) {
    try {
      // Buscar todas as marcas, modelos e anos únicos de Vehicle (todos os veículos cadastrados)
      const vehicles = await prisma.vehicle.findMany({
        select: {
          brand: true,
          model: true,
          year: true
        }
      });

      // Extrair valores únicos
      const brands = [...new Set(vehicles.map(v => v.brand))].filter(Boolean).sort();
      const models = [...new Set(vehicles.map(v => v.model))].filter(Boolean).sort();
      const years = [...new Set(vehicles.map(v => v.year))].filter(Boolean).sort((a, b) => b - a);

      res.json({
        brands,
        models,
        years
      });
    } catch (error) {
      console.error('Erro ao buscar opções:', error);
      res.status(500).json({ error: 'Erro ao buscar opções' });
    }
  }

  async exitStock(req, res) {
    try {
      const {
        estoqueId,
        exitType,
        saleType,
        exitDate,
        customerId,
        sellerId,
        tableValue,
        discount,
        saleValue,
        paymentMethods,
        transferStatus,
        transferNotes,
        saleChannel,
        saleChannelNotes,
        contractNotes,
        internalNotes
      } = req.body;

      if (!estoqueId || !exitType) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: estoqueId, exitType' 
        });
      }

      // Buscar o item do estoque
      const estoqueItem = await prisma.estoque.findUnique({
        where: { id: parseInt(estoqueId) }
      });

      if (!estoqueItem) {
        return res.status(404).json({ error: 'Item do estoque não encontrado' });
      }

      // Se for venda, criar uma venda e criar um veículo se necessário
      if (exitType === 'venda' || exitType === 'pre_venda') {
        if (!customerId || !sellerId) {
          return res.status(400).json({ 
            error: 'Para venda ou pré-venda, customerId e sellerId são obrigatórios' 
          });
        }

        // Verificar se já existe um veículo com esses dados
        let vehicle = await prisma.vehicle.findFirst({
          where: {
            brand: estoqueItem.brand,
            model: estoqueItem.model,
            year: estoqueItem.year,
            plate: estoqueItem.plate || null
          }
        });

        // Se não existir, criar um veículo
        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              brand: estoqueItem.brand,
              model: estoqueItem.model,
              year: estoqueItem.year,
              plate: estoqueItem.plate || null,
              km: estoqueItem.km || null,
              color: estoqueItem.color || null,
              price: saleValue ? parseFloat(saleValue) : (estoqueItem.value || null),
              cost: estoqueItem.value || null,
              tableValue: tableValue ? parseFloat(tableValue) : null,
              status: exitType === 'pre_venda' ? 'reservado' : 'vendido',
              notes: internalNotes || null,
              photos: estoqueItem.photos || null,
              customerId: parseInt(customerId)
            }
          });
        } else {
          // Atualizar o veículo existente
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              price: saleValue ? parseFloat(saleValue) : (vehicle.price || estoqueItem.value || null),
              cost: vehicle.cost || estoqueItem.value || null,
              tableValue: tableValue ? parseFloat(tableValue) : (vehicle.tableValue || null),
              status: exitType === 'pre_venda' ? 'reservado' : 'vendido',
              notes: internalNotes || vehicle.notes || null,
              customerId: parseInt(customerId)
            }
          });
        }

        // Criar a venda
        const saleData = {
          customerId: parseInt(customerId),
          vehicleId: vehicle.id,
          sellerId: parseInt(sellerId),
          salePrice: saleValue ? parseFloat(saleValue) : null,
          purchasePrice: estoqueItem.value || null,
          profit: saleValue && estoqueItem.value 
            ? parseFloat(saleValue) - parseFloat(estoqueItem.value) 
            : null,
          discountAmount: discount ? parseFloat(discount) : null,
          status: exitType === 'pre_venda' ? 'em_andamento' : 'concluida',
          date: exitDate ? new Date(exitDate) : new Date(),
          contractClauses: contractNotes || null,
          notes: internalNotes || null,
          saleType: saleType || null,
          transferStatus: transferStatus || null,
          transferNotes: transferNotes || null,
          saleChannel: saleChannel || null,
          saleChannelNotes: saleChannelNotes || null,
          internalNotes: internalNotes || null
        };

        // Processar formas de pagamento
        if (paymentMethods && paymentMethods.length > 0) {
          // Calcular entrada e restante
          let entryValue = 0;
          let remainingValue = saleValue ? parseFloat(saleValue) : 0;
          
          paymentMethods.forEach((pm) => {
            const value = parseFloat(pm.value) || 0;
            if (pm.type === 'dinheiro' || pm.type === 'pix') {
              entryValue += value;
            }
            remainingValue -= value;
          });

          saleData.entryValue = entryValue > 0 ? entryValue : null;
          saleData.remainingValue = remainingValue > 0 ? remainingValue : null;
          
          // Se houver financiamento, definir
          const financing = paymentMethods.find((pm) => pm.type === 'financiamento_bancario');
          if (financing) {
            saleData.financedValue = parseFloat(financing.value) || null;
            saleData.paymentMethod = 'financiamento_bancario';
          }
        }

        const sale = await prisma.sale.create({
          data: saleData
        });

        // Criar transações financeiras para cada forma de pagamento
        if (paymentMethods && paymentMethods.length > 0) {
          const transactions = paymentMethods.map((pm) => ({
            type: 'receita',
            description: `Venda - ${pm.type} - ${estoqueItem.brand} ${estoqueItem.model}`,
            amount: parseFloat(pm.value) || 0,
            dueDate: pm.date ? new Date(pm.date) : new Date(),
            status: 'pendente',
            saleId: sale.id
          }));

          await prisma.financialTransaction.createMany({
            data: transactions
          });
        }

        // Remover do estoque
        await prisma.estoque.delete({
          where: { id: parseInt(estoqueId) }
        });

        res.json({ 
          message: 'Saída de estoque processada com sucesso. Venda criada.',
          sale,
          vehicle
        });
      } else if (exitType === 'transferencia') {
        // Para transferência, apenas remover do estoque e registrar as informações
        // (você pode criar uma tabela de transferências se necessário)
        await prisma.estoque.delete({
          where: { id: parseInt(estoqueId) }
        });

        res.json({ 
          message: 'Transferência registrada. Item removido do estoque.',
          transferStatus,
          transferNotes
        });
      } else {
        return res.status(400).json({ error: 'Tipo de saída inválido' });
      }
    } catch (error) {
      console.error('Erro ao processar saída de estoque:', error);
      res.status(500).json({ error: 'Erro ao processar saída de estoque' });
    }
  }
}

module.exports = new EstoqueController();

