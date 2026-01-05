const prisma = require('../models/prisma');

class GoalController {
  async list(req, res) {
    try {
      const { userId, status, period } = req.query;
      const where = {};
      
      if (userId) where.userId = parseInt(userId);
      if (status) where.status = status;
      if (period) where.period = period;

      const goals = await prisma.goal.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Atualizar valores atuais baseado em vendas
      const goalsWithCurrentValue = await Promise.all(
        goals.map(async (goal) => {
          const currentValue = await this.calculateCurrentValue(goal);
          return { ...goal, currentValue };
        })
      );

      res.json(goalsWithCurrentValue);
    } catch (error) {
      console.error('Erro ao listar metas:', error);
      res.status(500).json({ error: 'Erro ao buscar metas' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const goal = await prisma.goal.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!goal) {
        return res.status(404).json({ error: 'Meta não encontrada' });
      }

      const currentValue = await this.calculateCurrentValue(goal);
      goal.currentValue = currentValue;

      res.json(goal);
    } catch (error) {
      console.error('Erro ao buscar meta:', error);
      res.status(500).json({ error: 'Erro ao buscar meta' });
    }
  }

  async create(req, res) {
    try {
      const {
        userId,
        type,
        targetValue,
        period,
        startDate,
        endDate
      } = req.body;

      if (!userId || !type || !targetValue || !period) {
        return res.status(400).json({
          error: 'Campos obrigatórios: userId, type, targetValue, period'
        });
      }

      const validTypes = ['sales', 'revenue', 'profit'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `type deve ser um dos: ${validTypes.join(', ')}`
        });
      }

      const goalData = {
        userId: parseInt(userId),
        type,
        targetValue: parseFloat(targetValue),
        currentValue: 0,
        period,
        status: 'active'
      };

      if (startDate) goalData.startDate = new Date(startDate);
      if (endDate) goalData.endDate = new Date(endDate);

      const goal = await prisma.goal.create({
        data: goalData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      res.status(201).json({ message: 'Meta criada com sucesso', goal });
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      res.status(500).json({ error: 'Erro ao criar meta' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        targetValue,
        startDate,
        endDate,
        status
      } = req.body;

      const updateData = {};
      if (targetValue !== undefined) updateData.targetValue = parseFloat(targetValue);
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (status) updateData.status = status;

      const goal = await prisma.goal.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Atualizar valor atual
      const currentValue = await this.calculateCurrentValue(goal);
      goal.currentValue = currentValue;

      res.json({ message: 'Meta atualizada com sucesso', goal });
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.goal.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Meta deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar meta:', error);
      res.status(500).json({ error: 'Erro ao deletar meta' });
    }
  }

  /**
   * Calcula o valor atual da meta baseado nas vendas do usuário
   */
  async calculateCurrentValue(goal) {
    try {
      const where = {
        sellerId: goal.userId
      };

      // Só filtra por data se ambas estiverem definidas
      if (goal.startDate && goal.endDate) {
        where.date = {
          gte: new Date(goal.startDate),
          lte: new Date(goal.endDate)
        };
      }

      const sales = await prisma.sale.findMany({
        where,
        select: {
          salePrice: true,
          profit: true
        }
      });

      switch (goal.type) {
        case 'sales':
          return sales.length;
        case 'revenue':
          return sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        case 'profit':
          return sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
        default:
          return 0;
      }
    } catch (error) {
      console.error('Erro ao calcular valor atual da meta:', error);
      return 0;
    }
  }
}

module.exports = new GoalController();

