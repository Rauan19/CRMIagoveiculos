const express = require('express');
const router = express.Router();
const categoriaFinanceiraController = require('../controllers/categoriaFinanceiraController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => categoriaFinanceiraController.list(req, res));
router.get('/nivel4', authenticateToken, (req, res) => categoriaFinanceiraController.getNivel4(req, res));
router.get('/:id', authenticateToken, (req, res) => categoriaFinanceiraController.getById(req, res));
router.post('/', authenticateToken, (req, res) => categoriaFinanceiraController.create(req, res));
router.put('/:id', authenticateToken, (req, res) => categoriaFinanceiraController.update(req, res));
router.delete('/:id', authenticateToken, (req, res) => categoriaFinanceiraController.delete(req, res));

module.exports = router;
