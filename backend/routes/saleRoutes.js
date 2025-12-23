const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateToken } = require('../middleware/auth');

// Listar todas as vendas
router.get('/', authenticateToken, (req, res) => saleController.list(req, res));

// Buscar venda por ID
router.get('/:id', authenticateToken, (req, res) => saleController.getById(req, res));

// Criar venda
router.post('/', authenticateToken, (req, res) => saleController.create(req, res));

// Atualizar venda
router.put('/:id', authenticateToken, (req, res) => saleController.update(req, res));

// Deletar venda
router.delete('/:id', authenticateToken, (req, res) => saleController.delete(req, res));

module.exports = router;
