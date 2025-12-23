const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/auth');

// Listar todos os veículos
router.get('/', authenticateToken, (req, res) => vehicleController.list(req, res));

// Estatísticas de estoque
router.get('/stats/stock', authenticateToken, (req, res) => vehicleController.getStockStats(req, res));

// Buscar veículo por ID
router.get('/:id', authenticateToken, (req, res) => vehicleController.getById(req, res));

// Criar veículo
router.post('/', authenticateToken, (req, res) => vehicleController.create(req, res));

// Atualizar veículo
router.put('/:id', authenticateToken, (req, res) => vehicleController.update(req, res));

// Deletar veículo
router.delete('/:id', authenticateToken, (req, res) => vehicleController.delete(req, res));

module.exports = router;
