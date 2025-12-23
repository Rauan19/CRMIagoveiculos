const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/auth');

// Gerar anúncio para veículo
router.post('/generate', authenticateToken, (req, res) => announcementController.generate(req, res));

// Listar templates disponíveis
router.get('/templates', authenticateToken, (req, res) => announcementController.getTemplates(req, res));

module.exports = router;
