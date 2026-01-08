const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/auth');

// Listar todas as metas
router.get('/', authenticateToken, (req, res) => goalController.list(req, res));

// Buscar meta por ID
router.get('/:id', authenticateToken, (req, res) => goalController.getById(req, res));

// Criar meta
router.post('/', authenticateToken, (req, res) => goalController.create(req, res));

// Atualizar meta
router.put('/:id', authenticateToken, (req, res) => goalController.update(req, res));

// Deletar meta
router.delete('/:id', authenticateToken, (req, res) => goalController.delete(req, res));

module.exports = router;


