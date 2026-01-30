const express = require('express');
const router = express.Router();
const fichaCadastralController = require('../controllers/fichaCadastralController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => fichaCadastralController.list(req, res));
router.get('/:id', authenticateToken, (req, res) => fichaCadastralController.getById(req, res));
router.post('/', authenticateToken, (req, res) => fichaCadastralController.create(req, res));
router.put('/:id', authenticateToken, (req, res) => fichaCadastralController.update(req, res));
router.delete('/:id', authenticateToken, (req, res) => fichaCadastralController.delete(req, res));

module.exports = router;
