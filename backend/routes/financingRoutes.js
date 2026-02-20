const express = require('express');
const router = express.Router();
const FinancingController = require('../controllers/financingController');

router.get('/', FinancingController.list);

module.exports = router;

