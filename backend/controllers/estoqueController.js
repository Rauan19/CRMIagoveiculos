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
          { brand: { contains: search } },
          { model: { contains: search } }
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

      const item = await prisma.estoque.create({
        data: {
          brand,
          model,
          year: parseInt(year),
          plate: plate || null,
          km: km ? parseInt(km) : null,
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

      const updateData = {};
      if (brand !== undefined) updateData.brand = brand;
      if (model !== undefined) updateData.model = model;
      if (year !== undefined) updateData.year = parseInt(year);
      if (plate !== undefined) updateData.plate = plate || null;
      if (km !== undefined) updateData.km = km ? parseInt(km) : null;
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
}

module.exports = new EstoqueController();

