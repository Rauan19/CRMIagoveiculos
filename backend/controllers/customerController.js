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
        include: {
          sales: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Adicionar contagem de compras para cada cliente
      const customersWithSales = customers.map(customer => ({
        ...customer,
        compras: customer.sales?.length || 0
      }));

      res.json(customersWithSales);
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
        pessoaType,
        apelido,
        marcador,
        nomeMae,
        facebook,
        instagram,
        website,
        nacionalidade,
        naturalidade,
        sexo,
        estadoCivil,
        profissao,
        cnh,
        cnhVencimento,
        adicional,
        pendenciasFinanceiras,
        status 
      } = req.body;

      if (!name || !phone || !pessoaType || !cpf) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: name, phone, pessoaType, cpf' 
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
          pessoaType: pessoaType || 'Física',
          apelido: apelido || null,
          marcador: marcador || null,
          nomeMae: nomeMae || null,
          facebook: facebook || null,
          instagram: instagram || null,
          website: website || null,
          nacionalidade: nacionalidade || 'BRASILEIRA',
          naturalidade: naturalidade || null,
          sexo: sexo || null,
          estadoCivil: estadoCivil || null,
          profissao: profissao || null,
          cnh: cnh || null,
          cnhVencimento: cnhVencimento ? new Date(cnhVencimento) : null,
          adicional: adicional || null,
          pendenciasFinanceiras: pendenciasFinanceiras || null,
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
        pessoaType,
        apelido,
        marcador,
        nomeMae,
        facebook,
        instagram,
        website,
        nacionalidade,
        naturalidade,
        sexo,
        estadoCivil,
        profissao,
        cnh,
        cnhVencimento,
        adicional,
        pendenciasFinanceiras,
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
      if (pessoaType !== undefined) updateData.pessoaType = pessoaType;
      if (apelido !== undefined) updateData.apelido = apelido;
      if (marcador !== undefined) updateData.marcador = marcador;
      if (nomeMae !== undefined) updateData.nomeMae = nomeMae;
      if (facebook !== undefined) updateData.facebook = facebook;
      if (instagram !== undefined) updateData.instagram = instagram;
      if (website !== undefined) updateData.website = website;
      if (nacionalidade !== undefined) updateData.nacionalidade = nacionalidade;
      if (naturalidade !== undefined) updateData.naturalidade = naturalidade;
      if (sexo !== undefined) updateData.sexo = sexo;
      if (estadoCivil !== undefined) updateData.estadoCivil = estadoCivil;
      if (profissao !== undefined) updateData.profissao = profissao;
      if (cnh !== undefined) updateData.cnh = cnh;
      if (cnhVencimento !== undefined) updateData.cnhVencimento = cnhVencimento ? new Date(cnhVencimento) : null;
      if (adicional !== undefined) updateData.adicional = adicional;
      if (pendenciasFinanceiras !== undefined) updateData.pendenciasFinanceiras = pendenciasFinanceiras;
      if (status !== undefined) updateData.status = status;

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


