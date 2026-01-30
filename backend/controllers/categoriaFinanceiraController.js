const prisma = require('../models/prisma');

class CategoriaFinanceiraController {
  async list(req, res) {
    try {
      const { nivel, parentId, ativo } = req.query;
      
      const where = {};
      if (nivel) where.nivel = parseInt(nivel);
      if (parentId !== undefined) {
        if (parentId === null || parentId === 'null') {
          where.parentId = null;
        } else {
          where.parentId = parseInt(parentId);
        }
      }
      if (ativo !== undefined) where.ativo = ativo === 'true';

      const categorias = await prisma.categoriaFinanceira.findMany({
        where,
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          },
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          }
        },
        orderBy: [
          { nivel: 'asc' },
          { nome: 'asc' }
        ]
      });

      res.json(categorias);
    } catch (error) {
      console.error('Erro ao listar categorias financeiras:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias financeiras' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const categoria = await prisma.categoriaFinanceira.findUnique({
        where: { id: parseInt(id) },
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          },
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          }
        }
      });

      if (!categoria) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      res.json(categoria);
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  async create(req, res) {
    try {
      const { nome, nivel, parentId, codigo, descricao, ativo } = req.body;

      if (!nome || !nivel) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: nome, nivel' 
        });
      }

      // Validar nível
      if (nivel < 1 || nivel > 4) {
        return res.status(400).json({ 
          error: 'Nível deve ser entre 1 e 4' 
        });
      }

      // Validar hierarquia
      if (nivel > 1 && !parentId) {
        return res.status(400).json({ 
          error: 'Categorias de nível 2, 3 ou 4 devem ter um parentId' 
        });
      }

      if (parentId) {
        const parent = await prisma.categoriaFinanceira.findUnique({
          where: { id: parseInt(parentId) }
        });

        if (!parent) {
          return res.status(404).json({ error: 'Categoria pai não encontrada' });
        }

        if (parent.nivel !== nivel - 1) {
          return res.status(400).json({ 
            error: `Categoria pai deve ser de nível ${nivel - 1}` 
          });
        }
      }

      const categoria = await prisma.categoriaFinanceira.create({
        data: {
          nome,
          nivel: parseInt(nivel),
          parentId: parentId ? parseInt(parentId) : null,
          codigo: codigo || null,
          descricao: descricao || null,
          ativo: ativo !== undefined ? ativo : true
        }
      });

      res.status(201).json({ message: 'Categoria criada com sucesso', categoria });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, nivel, parentId, codigo, descricao, ativo } = req.body;

      const updateData = {};
      if (nome !== undefined) updateData.nome = nome;
      if (nivel !== undefined) {
        if (nivel < 1 || nivel > 4) {
          return res.status(400).json({ error: 'Nível deve ser entre 1 e 4' });
        }
        updateData.nivel = parseInt(nivel);
      }
      if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;
      if (codigo !== undefined) updateData.codigo = codigo || null;
      if (descricao !== undefined) updateData.descricao = descricao || null;
      if (ativo !== undefined) updateData.ativo = ativo;

      const categoria = await prisma.categoriaFinanceira.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Categoria atualizada com sucesso', categoria });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se tem filhos
      const children = await prisma.categoriaFinanceira.findMany({
        where: { parentId: parseInt(id) }
      });

      if (children.length > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir categoria que possui subcategorias' 
        });
      }

      // Verificar se está sendo usada em transações
      const transactions = await prisma.financialTransaction.findMany({
        where: { categoriaFinanceiraId: parseInt(id) },
        take: 1
      });

      if (transactions.length > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir categoria que está sendo usada em transações' 
        });
      }

      await prisma.categoriaFinanceira.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
  }

  async getNivel4(req, res) {
    try {
      const categorias = await prisma.categoriaFinanceira.findMany({
        where: { nivel: 4, ativo: true },
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          }
        },
        orderBy: { nome: 'asc' }
      });

      res.json(categorias);
    } catch (error) {
      console.error('Erro ao buscar categorias nível 4:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias nível 4' });
    }
  }
}

module.exports = new CategoriaFinanceiraController();
