const axios = require('axios');

class FipeService {
  constructor() {
    // API FIPE não oficial (API gratuita)
    // Alternativa: https://deividfortuna.github.io/fipe/
    this.baseURL = 'https://parallelum.com.br/fipe/api/v1';
  }

  /**
   * Valida o tipo de veículo
   */
  validateVehicleType(type) {
    const validTypes = ['carros', 'motos', 'caminhoes'];
    return validTypes.includes(type) ? type : 'carros';
  }

  /**
   * Busca o código FIPE de um veículo pela marca, modelo e ano
   * @param {string} brand - Marca do veículo
   * @param {string} model - Modelo do veículo
   * @param {number} year - Ano do veículo
   * @param {string} vehicleType - Tipo do veículo: 'carros', 'motos' ou 'caminhoes' (padrão: 'carros')
   * @returns {Promise<Object>} Dados do veículo na tabela FIPE
   */
  async searchVehicle(brand, model, year, vehicleType = 'carros') {
    try {
      const type = this.validateVehicleType(vehicleType);
      
      // Primeiro, buscar todas as marcas
      const brandsResponse = await axios.get(`${this.baseURL}/${type}/marcas`);
      const brands = brandsResponse.data;
      
      // Encontrar a marca que corresponde (busca parcial)
      const brandMatch = brands.find(b => 
        b.nome.toLowerCase().includes(brand.toLowerCase()) ||
        brand.toLowerCase().includes(b.nome.toLowerCase())
      );

      if (!brandMatch) {
        throw new Error(`Marca "${brand}" não encontrada na tabela FIPE`);
      }

      // Buscar modelos da marca
      const modelsResponse = await axios.get(`${this.baseURL}/${type}/marcas/${brandMatch.codigo}/modelos`);
      const models = modelsResponse.data.modelos || [];
      
      // Encontrar o modelo que corresponde (busca parcial)
      const modelMatch = models.find(m => 
        m.nome.toLowerCase().includes(model.toLowerCase()) ||
        model.toLowerCase().includes(m.nome.toLowerCase())
      );

      if (!modelMatch) {
        throw new Error(`Modelo "${model}" da marca "${brand}" não encontrado na tabela FIPE`);
      }

      // Buscar anos do modelo
      const yearsResponse = await axios.get(`${this.baseURL}/${type}/marcas/${brandMatch.codigo}/modelos/${modelMatch.codigo}/anos`);
      const years = yearsResponse.data;

      // Encontrar o ano mais próximo (pode ser gasolina, álcool, flex, etc)
      // Buscar por ano de referência (ex: 2024-1, 2023-1)
      const yearPrefix = year.toString();
      const yearMatch = years.find(y => y.codigo.startsWith(yearPrefix)) || years[0];

      if (!yearMatch) {
        throw new Error(`Ano "${year}" para o modelo "${model}" não encontrado na tabela FIPE`);
      }

      // Buscar valor FIPE
      const valueResponse = await axios.get(`${this.baseURL}/${type}/marcas/${brandMatch.codigo}/modelos/${modelMatch.codigo}/anos/${yearMatch.codigo}`);
      
      const fipeData = {
        valor: this.parseFipeValue(valueResponse.data.Valor),
        marca: valueResponse.data.Marca,
        modelo: valueResponse.data.Modelo,
        anoModelo: valueResponse.data.AnoModelo,
        combustivel: valueResponse.data.Combustivel,
        codigoFipe: valueResponse.data.CodigoFipe,
        mesReferencia: valueResponse.data.MesReferencia,
        tipoVeiculo: valueResponse.data.TipoVeiculo,
        siglaCombustivel: valueResponse.data.SiglaCombustivel,
      };

      return fipeData;
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error.message);
      throw error;
    }
  }

  /**
   * Converte valor FIPE de string para número
   * Ex: "R$ 45.000,00" -> 45000.00
   */
  parseFipeValue(valueString) {
    if (!valueString) return null;
    
    // Remove "R$", espaços e converte vírgula para ponto
    const cleaned = valueString
      .replace('R$', '')
      .replace(/\./g, '') // Remove pontos de milhar
      .replace(',', '.')  // Substitui vírgula decimal por ponto
      .trim();
    
    return parseFloat(cleaned) || null;
  }

  /**
   * Busca apenas o valor FIPE (método simplificado)
   */
  async getFipeValue(brand, model, year, vehicleType = 'carros') {
    try {
      const data = await this.searchVehicle(brand, model, year, vehicleType);
      return data.valor;
    } catch (error) {
      console.error('Erro ao buscar valor FIPE:', error.message);
      return null;
    }
  }

  /**
   * Lista todas as marcas disponíveis
   * @param {string} vehicleType - Tipo do veículo: 'carros', 'motos' ou 'caminhoes' (padrão: 'carros')
   */
  async getBrands(vehicleType = 'carros') {
    try {
      const type = this.validateVehicleType(vehicleType);
      const response = await axios.get(`${this.baseURL}/${type}/marcas`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      throw error;
    }
  }

  /**
   * Lista modelos de uma marca
   * @param {string} brandCode - Código da marca
   * @param {string} vehicleType - Tipo do veículo: 'carros', 'motos' ou 'caminhoes' (padrão: 'carros')
   */
  async getModels(brandCode, vehicleType = 'carros') {
    try {
      const type = this.validateVehicleType(vehicleType);
      const response = await axios.get(`${this.baseURL}/${type}/marcas/${brandCode}/modelos`);
      return response.data.modelos || [];
    } catch (error) {
      console.error('Erro ao buscar modelos FIPE:', error);
      throw error;
    }
  }

  /**
   * Lista anos disponíveis para um modelo específico
   * @param {string} brandCode - Código da marca
   * @param {string} modelCode - Código do modelo
   * @param {string} vehicleType - Tipo do veículo: 'carros', 'motos' ou 'caminhoes' (padrão: 'carros')
   */
  async getYears(brandCode, modelCode, vehicleType = 'carros') {
    try {
      const type = this.validateVehicleType(vehicleType);
      const response = await axios.get(`${this.baseURL}/${type}/marcas/${brandCode}/modelos/${modelCode}/anos`);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar anos FIPE:', error);
      throw error;
    }
  }
}

module.exports = new FipeService();

