const prisma = require('../models/prisma');

class CustomerController {
  async list(req, res) {
    try {
      const { status, search } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } }
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json(customers);
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const customer = await prisma.customer.findUnique({
        where: { id: parseInt(id) },
        include: {
          sales: {
            include: {
              vehicle: {
                select: { id: true, brand: true, model: true, year: true }
              },
              seller: {
                select: { id: true, name: true }
              }
            }
          },
          tradeIns: true
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(customer);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  async create(req, res) {
    try {
      const { 
        name, 
        email, 
        phone, 
        cpf, 
        rg, 
        address, 
        city, 
        district, 
        cep, 
        birthDate,
        status 
      } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: name, phone' 
        });
      }

      const customer = await prisma.customer.create({
        data: {
          name,
          email: email || null,
          phone,
          cpf: cpf || null,
          rg: rg || null,
          address: address || null,
          city: city || null,
          district: district || null,
          cep: cep || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          status: status || 'novo'
        }
      });

      res.status(201).json({ message: 'Cliente criado com sucesso', customer });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        email, 
        phone, 
        cpf, 
        rg, 
        address, 
        city, 
        district, 
        cep, 
        birthDate,
        status 
      } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (cpf !== undefined) updateData.cpf = cpf;
      if (rg !== undefined) updateData.rg = rg;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (district !== undefined) updateData.district = district;
      if (cep !== undefined) updateData.cep = cep;
      if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
      if (status) updateData.status = status;

      const customer = await prisma.customer.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Cliente atualizado com sucesso', customer });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.customer.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Cliente deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }

  async getUpcomingBirthdays(req, res) {
    try {
      const birthdayScheduler = require('../services/birthdayScheduler');
      const days = parseInt(req.query.days) || 30;
      const upcoming = await birthdayScheduler.getUpcomingBirthdays(days);
      res.json(upcoming);
    } catch (error) {
      console.error('Erro ao buscar próximos aniversários:', error);
      res.status(500).json({ error: 'Erro ao buscar próximos aniversários' });
    }
  }
}

module.exports = new CustomerController();


