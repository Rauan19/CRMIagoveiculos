const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');

// Listar todos os clientes
router.get('/', authenticateToken, (req, res) => customerController.list(req, res));

// Listar próximos aniversários
router.get('/birthdays/upcoming', authenticateToken, (req, res) => customerController.getUpcomingBirthdays(req, res));

// Buscar cliente por ID
router.get('/:id', authenticateToken, (req, res) => customerController.getById(req, res));

// Criar cliente
router.post('/', authenticateToken, (req, res) => customerController.create(req, res));

// Atualizar cliente
router.put('/:id', authenticateToken, (req, res) => customerController.update(req, res));

// Deletar cliente
router.delete('/:id', authenticateToken, (req, res) => customerController.delete(req, res));

module.exports = router;
