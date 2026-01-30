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
          phone: true,
          avatar: true,
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
      const { name, email, role, password, phone, avatar } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (password) updateData.password = await hashPassword(password);
      if (phone !== undefined) updateData.phone = phone;
      if (avatar !== undefined) updateData.avatar = avatar;

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true
        }
      });

      res.json({ message: 'Usuário atualizado com sucesso', user });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  async getMe(req, res) {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  }

  async updateMe(req, res) {
    try {
      const userId = req.user.id;
      const { name, email, phone, password } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (password) updateData.password = await hashPassword(password);

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true
        }
      });

      res.json({ message: 'Perfil atualizado com sucesso', user });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  }

  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatar } = req.body; // URL da imagem (base64 ou URL)

      if (!avatar) {
        return res.status(400).json({ error: 'Avatar é obrigatório' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatar },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      });

      res.json({ message: 'Avatar atualizado com sucesso', user });
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      res.status(500).json({ error: 'Erro ao atualizar avatar' });
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


