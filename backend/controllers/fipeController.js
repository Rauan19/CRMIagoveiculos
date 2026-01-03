const fipeService = require('../services/fipeService');

class FipeController {
  /**
   * Busca valor FIPE de um veículo
   */
  async searchFipeValue(req, res) {
    try {
      const { brand, model, year } = req.query;

      if (!brand || !model || !year) {
        return res.status(400).json({
          error: 'Parâmetros obrigatórios: brand, model, year'
        });
      }

      const fipeData = await fipeService.searchVehicle(brand, model, parseInt(year));
      
      res.json(fipeData);
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error);
      res.status(500).json({
        error: error.message || 'Erro ao buscar valor FIPE'
      });
    }
  }

  /**
   * Lista marcas disponíveis na FIPE
   */
  async getBrands(req, res) {
    try {
      const brands = await fipeService.getBrands();
      res.json(brands);
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      res.status(500).json({ error: 'Erro ao buscar marcas FIPE' });
    }
  }

  /**
   * Lista modelos de uma marca
   */
  async getModels(req, res) {
    try {
      const { brandCode } = req.params;
      const models = await fipeService.getModels(brandCode);
      res.json(models);
    } catch (error) {
      console.error('Erro ao buscar modelos FIPE:', error);
      res.status(500).json({ error: 'Erro ao buscar modelos FIPE' });
    }
  }

  /**
   * Lista anos disponíveis para um modelo
   */
  async getYears(req, res) {
    try {
      const { brandCode, modelCode } = req.params;
      const years = await fipeService.getYears(brandCode, modelCode);
      res.json(years);
    } catch (error) {
      console.error('Erro ao buscar anos FIPE:', error);
      res.status(500).json({ error: 'Erro ao buscar anos FIPE' });
    }
  }
}

module.exports = new FipeController();

