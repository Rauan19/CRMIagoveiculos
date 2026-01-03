const express = require('express');
const router = express.Router();
const fipeController = require('../controllers/fipeController');
const { authenticateToken } = require('../middleware/auth');

// Buscar valor FIPE
router.get('/search', authenticateToken, (req, res) => fipeController.searchFipeValue(req, res));

// Listar marcas
router.get('/brands', authenticateToken, (req, res) => fipeController.getBrands(req, res));

// Listar modelos de uma marca
router.get('/brands/:brandCode/models', authenticateToken, (req, res) => fipeController.getModels(req, res));

// Listar anos de um modelo
router.get('/brands/:brandCode/models/:modelCode/years', authenticateToken, (req, res) => fipeController.getYears(req, res));

module.exports = router;

