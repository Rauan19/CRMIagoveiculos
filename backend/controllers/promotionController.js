const prisma = require('../models/prisma');

class PromotionController {
  async list(req, res) {
    try {
      const { status } = req.query;
      const where = {};
      
      if (status) {
        where.status = status;
      } else {
        // Por padrão, mostrar apenas ativas
        where.status = 'ativa';
      }

      const promotions = await prisma.promotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { sales: true }
          }
        }
      });

      // Marcar promoções expiradas
      const now = new Date();
      const promotionsWithStatus = promotions.map(promo => {
        if (new Date(promo.endDate) < now && promo.status === 'ativa') {
          return { ...promo, status: 'expirada' };
        }
        return promo;
      });

      res.json(promotionsWithStatus);
    } catch (error) {
      console.error('Erro ao listar promoções:', error);
      res.status(500).json({ error: 'Erro ao buscar promoções' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const promotion = await prisma.promotion.findUnique({
        where: { id: parseInt(id) },
        include: {
          sales: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true }
              },
              vehicle: {
                select: { id: true, brand: true, model: true, year: true }
              }
            }
          }
        }
      });

      if (!promotion) {
        return res.status(404).json({ error: 'Promoção não encontrada' });
      }

      res.json(promotion);
    } catch (error) {
      console.error('Erro ao buscar promoção:', error);
      res.status(500).json({ error: 'Erro ao buscar promoção' });
    }
  }

  async create(req, res) {
    try {
      const {
        name,
        description,
        discountType,
        discountValue,
        startDate,
        endDate,
        applicableTo,
        minPurchaseValue
      } = req.body;

      if (!name || !discountType || !discountValue || !startDate || !endDate) {
        return res.status(400).json({
          error: 'Campos obrigatórios: name, discountType, discountValue, startDate, endDate'
        });
      }

      if (discountType !== 'percentage' && discountType !== 'fixed') {
        return res.status(400).json({
          error: 'discountType deve ser "percentage" ou "fixed"'
        });
      }

      if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
        return res.status(400).json({
          error: 'Desconto percentual deve estar entre 0 e 100'
        });
      }

      const promotion = await prisma.promotion.create({
        data: {
          name,
          description: description || null,
          discountType,
          discountValue: parseFloat(discountValue),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'ativa',
          applicableTo: applicableTo || 'all',
          minPurchaseValue: minPurchaseValue ? parseFloat(minPurchaseValue) : null
        }
      });

      res.status(201).json({ message: 'Promoção criada com sucesso', promotion });
    } catch (error) {
      console.error('Erro ao criar promoção:', error);
      res.status(500).json({ error: 'Erro ao criar promoção' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        discountType,
        discountValue,
        startDate,
        endDate,
        status,
        applicableTo,
        minPurchaseValue
      } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (discountType) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue);
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (status) updateData.status = status;
      if (applicableTo !== undefined) updateData.applicableTo = applicableTo;
      if (minPurchaseValue !== undefined) updateData.minPurchaseValue = minPurchaseValue ? parseFloat(minPurchaseValue) : null;

      const promotion = await prisma.promotion.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Promoção atualizada com sucesso', promotion });
    } catch (error) {
      console.error('Erro ao atualizar promoção:', error);
      res.status(500).json({ error: 'Erro ao atualizar promoção' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.promotion.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Promoção deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar promoção:', error);
      res.status(500).json({ error: 'Erro ao deletar promoção' });
    }
  }

  /**
   * Calcula o valor do desconto baseado no tipo e valor da promoção
   */
  calculateDiscount(promotion, salePrice) {
    if (!promotion || !salePrice) return 0;

    const now = new Date();
    if (new Date(promotion.startDate) > now || new Date(promotion.endDate) < now) {
      return 0; // Promoção não está ativa
    }

    if (promotion.status !== 'ativa') return 0;

    if (promotion.minPurchaseValue && salePrice < promotion.minPurchaseValue) {
      return 0; // Valor mínimo não atingido
    }

    if (promotion.discountType === 'percentage') {
      return (salePrice * promotion.discountValue) / 100;
    } else {
      return Math.min(promotion.discountValue, salePrice); // Não pode ser maior que o preço
    }
  }
}

module.exports = new PromotionController();

