const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { authenticateToken } = require('../middleware/auth');

// Listar todas as promoções
router.get('/', authenticateToken, (req, res) => promotionController.list(req, res));

// Buscar promoção por ID
router.get('/:id', authenticateToken, (req, res) => promotionController.getById(req, res));

// Criar promoção
router.post('/', authenticateToken, (req, res) => promotionController.create(req, res));

// Atualizar promoção
router.put('/:id', authenticateToken, (req, res) => promotionController.update(req, res));

// Deletar promoção
router.delete('/:id', authenticateToken, (req, res) => promotionController.delete(req, res));

module.exports = router;

