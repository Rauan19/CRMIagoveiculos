const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');
const { authenticateToken } = require('../middleware/auth');

// Buscar opções de veículos (marcas, modelos, anos)
router.get('/options', authenticateToken, (req, res) => estoqueController.getVehicleOptions(req, res));

// Listar todos os itens do estoque (pública - sem autenticação)
router.get('/', (req, res) => estoqueController.list(req, res));

// Buscar item por ID
router.get('/storage', authenticateToken, (req, res) => estoqueController.getStorageInfo(req, res));

// Buscar item por ID
router.get('/:id', authenticateToken, (req, res) => estoqueController.getById(req, res));

// Criar novo item
router.post('/', authenticateToken, (req, res) => estoqueController.create(req, res));

// Atualizar item
router.put('/:id', authenticateToken, (req, res) => estoqueController.update(req, res));

// Deletar item
router.delete('/:id', authenticateToken, (req, res) => estoqueController.delete(req, res));

module.exports = router;

