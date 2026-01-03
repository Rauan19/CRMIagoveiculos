const prisma = require('../models/prisma');
const { hashPassword } = require('../utils/password');

class UserController {
  async list(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { sales: true }
          }
        }
      });

      res.json(users);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  }

  async listSellers(req, res) {
    try {
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: ['vendedor', 'gerente', 'admin']
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json(users);
    } catch (error) {
      console.error('Erro ao listar vendedores:', error);
      res.status(500).json({ error: 'Erro ao buscar vendedores' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          sales: {
            select: {
              id: true,
              salePrice: true,
              date: true,
              status: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, password } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (password) updateData.password = await hashPassword(password);

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      res.json({ message: 'Usuário atualizado com sucesso', user });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.user.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
}

module.exports = new UserController();


