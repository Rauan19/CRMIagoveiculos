const prisma = require('../models/prisma');

class FichaCadastralController {
  async list(req, res) {
    try {
      const { vehicleId } = req.query;
      
      const where = {};
      if (vehicleId) where.vehicleId = parseInt(vehicleId);

      const fichas = await prisma.fichaCadastral.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(fichas);
    } catch (error) {
      console.error('Erro ao listar fichas cadastrais:', error);
      res.status(500).json({ error: 'Erro ao buscar fichas cadastrais' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const ficha = await prisma.fichaCadastral.findUnique({
        where: { id: parseInt(id) },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              plate: true
            }
          }
        }
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha cadastral não encontrada' });
      }

      res.json(ficha);
    } catch (error) {
      console.error('Erro ao buscar ficha cadastral:', error);
      res.status(500).json({ error: 'Erro ao buscar ficha cadastral' });
    }
  }

  async create(req, res) {
    try {
      const data = req.body;
      
      // Converter strings JSON para objetos se necessário
      if (data.referenciasPessoais && typeof data.referenciasPessoais === 'string') {
        try {
          data.referenciasPessoais = JSON.parse(data.referenciasPessoais);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }
      if (data.referenciasBancarias && typeof data.referenciasBancarias === 'string') {
        try {
          data.referenciasBancarias = JSON.parse(data.referenciasBancarias);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }
      if (data.bensPessoais && typeof data.bensPessoais === 'string') {
        try {
          data.bensPessoais = JSON.parse(data.bensPessoais);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }

      // Converter datas
      const dateFields = ['dataEmissaoCNH', 'dataEmissaoRG', 'dataNascimento', 'dataAdmissao', 'dataNascimentoConjuge'];
      dateFields.forEach(field => {
        if (data[field]) {
          data[field] = new Date(data[field]);
        }
      });

      // Converter valores numéricos
      const numericFields = ['anoFabricacao', 'anoModelo', 'parcelas', 'dependentes', 'valor', 'valorEntrada', 'valorFinanciado', 'valorParcela', 'rendaMensal', 'rendaExtra', 'rendaConjuge'];
      numericFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          data[field] = parseFloat(data[field]);
        } else {
          data[field] = null;
        }
      });

      const ficha = await prisma.fichaCadastral.create({
        data: {
          ...data,
          vehicleId: parseInt(data.vehicleId),
          referenciasPessoais: data.referenciasPessoais ? (typeof data.referenciasPessoais === 'string' ? data.referenciasPessoais : JSON.stringify(data.referenciasPessoais)) : null,
          referenciasBancarias: data.referenciasBancarias ? (typeof data.referenciasBancarias === 'string' ? data.referenciasBancarias : JSON.stringify(data.referenciasBancarias)) : null,
          bensPessoais: data.bensPessoais ? (typeof data.bensPessoais === 'string' ? data.bensPessoais : JSON.stringify(data.bensPessoais)) : null,
        }
      });

      res.status(201).json({ message: 'Ficha cadastral criada com sucesso', ficha });
    } catch (error) {
      console.error('Erro ao criar ficha cadastral:', error);
      res.status(500).json({ error: 'Erro ao criar ficha cadastral' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Converter strings JSON para objetos se necessário
      if (data.referenciasPessoais && typeof data.referenciasPessoais === 'string') {
        try {
          data.referenciasPessoais = JSON.parse(data.referenciasPessoais);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }
      if (data.referenciasBancarias && typeof data.referenciasBancarias === 'string') {
        try {
          data.referenciasBancarias = JSON.parse(data.referenciasBancarias);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }
      if (data.bensPessoais && typeof data.bensPessoais === 'string') {
        try {
          data.bensPessoais = JSON.parse(data.bensPessoais);
        } catch (e) {
          // Manter como string se não for JSON válido
        }
      }

      // Converter datas
      const dateFields = ['dataEmissaoCNH', 'dataEmissaoRG', 'dataNascimento', 'dataAdmissao', 'dataNascimentoConjuge'];
      dateFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          data[field] = new Date(data[field]);
        } else if (data[field] === '') {
          data[field] = null;
        }
      });

      // Converter valores numéricos
      const numericFields = ['anoFabricacao', 'anoModelo', 'parcelas', 'dependentes', 'valor', 'valorEntrada', 'valorFinanciado', 'valorParcela', 'rendaMensal', 'rendaExtra', 'rendaConjuge'];
      numericFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          data[field] = parseFloat(data[field]);
        } else if (data[field] === '') {
          data[field] = null;
        }
      });

      const updateData = {};
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'vehicleId') {
          if (['referenciasPessoais', 'referenciasBancarias', 'bensPessoais'].includes(key)) {
            updateData[key] = data[key] ? (typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key])) : null;
          } else {
            updateData[key] = data[key] !== undefined ? data[key] : undefined;
          }
        }
      });

      const ficha = await prisma.fichaCadastral.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({ message: 'Ficha cadastral atualizada com sucesso', ficha });
    } catch (error) {
      console.error('Erro ao atualizar ficha cadastral:', error);
      res.status(500).json({ error: 'Erro ao atualizar ficha cadastral' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.fichaCadastral.delete({
        where: { id: parseInt(id) }
      });
      res.json({ message: 'Ficha cadastral excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir ficha cadastral:', error);
      res.status(500).json({ error: 'Erro ao excluir ficha cadastral' });
    }
  }
}

module.exports = new FichaCadastralController();
