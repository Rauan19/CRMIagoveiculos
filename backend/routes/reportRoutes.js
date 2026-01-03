const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Estatísticas do dashboard
router.get('/dashboard', authenticateToken, (req, res) => reportController.getDashboardStats(req, res));

// Relatório de vendas por período
router.get('/sales', authenticateToken, (req, res) => reportController.getSalesReport(req, res));

// Relatório de lucratividade
router.get('/profitability', authenticateToken, (req, res) => reportController.getProfitabilityReport(req, res));

// Relatório de veículos parados
router.get('/vehicles-stuck', authenticateToken, (req, res) => reportController.getVehiclesStuckReport(req, res));

// Relatório de clientes
router.get('/customers', authenticateToken, (req, res) => reportController.getCustomersReport(req, res));

// Relatório de veículos
router.get('/vehicles', authenticateToken, (req, res) => reportController.getVehiclesReport(req, res));

// Relatório de trade-ins
router.get('/trade-ins', authenticateToken, (req, res) => reportController.getTradeInsReport(req, res));

// Relatórios avançados
router.get('/seller-performance', authenticateToken, (req, res) => reportController.getSellerPerformanceReport(req, res));
router.get('/top-selling-vehicles', authenticateToken, (req, res) => reportController.getTopSellingVehiclesReport(req, res));
router.get('/profitability-analysis', authenticateToken, (req, res) => reportController.getProfitabilityAnalysisReport(req, res));

module.exports = router;
