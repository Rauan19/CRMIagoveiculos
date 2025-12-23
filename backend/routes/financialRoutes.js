const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticateToken } = require('../middleware/auth');

// Dashboard financeiro
router.get('/dashboard', authenticateToken, (req, res) => financialController.getDashboard(req, res));

// Listar transações
router.get('/transactions', authenticateToken, (req, res) => financialController.listTransactions(req, res));

// Criar transação
router.post('/transactions', authenticateToken, (req, res) => financialController.createTransaction(req, res));

// Atualizar transação
router.put('/transactions/:id', authenticateToken, (req, res) => financialController.updateTransaction(req, res));

module.exports = router;
