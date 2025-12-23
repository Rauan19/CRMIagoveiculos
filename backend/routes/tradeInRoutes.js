const express = require('express');
const router = express.Router();
const tradeInController = require('../controllers/tradeInController');
const { authenticateToken } = require('../middleware/auth');

// Listar todos os trade-ins
router.get('/', authenticateToken, (req, res) => tradeInController.list(req, res));

// Buscar trade-in por ID
router.get('/:id', authenticateToken, (req, res) => tradeInController.getById(req, res));

// Criar trade-in
router.post('/', authenticateToken, (req, res) => tradeInController.create(req, res));

// Atualizar trade-in
router.put('/:id', authenticateToken, (req, res) => tradeInController.update(req, res));

// Deletar trade-in
router.delete('/:id', authenticateToken, (req, res) => tradeInController.delete(req, res));

module.exports = router;
