const prisma = require('../models/prisma');

class VehicleController {
  async list(req, res) {
    try {
      const { status, search, brand, year } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (brand) where.brand = { contains: brand, mode: 'insensitive' };
      if (year) where.year = parseInt(year);
      if (search) {
        where.OR = [
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } }
        ];
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(vehicles);
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
          customer: {
            select: { id: true, name: true, phone: true }
          },
          sale: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true }
              },
              seller: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      res.json(vehicle);
    } catch (error) {
      console.error('Erro ao buscar veículo:', error);
      res.status(500).json({ error: 'Erro ao buscar veículo' });
    }
  }

  async create(req, res) {
    try {
      const { brand, model, year, plate, km, color, price, cost, tableValue, expenseType, expenseValue, customerId, notes, photos, status } = req.body;

      if (!brand || !model || !year) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: brand, model, year' 
        });
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
          status: status || 'disponivel'
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          }
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
      const { brand, model, year, plate, km, color, price, cost, tableValue, expenseType, expenseValue, customerId, notes, photos, status } = req.body;

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

