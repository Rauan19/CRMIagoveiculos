const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const commissionController = require('../controllers/commissionController');

router.get('/', authenticateToken, (req, res) => commissionController.list(req, res));

module.exports = router;
