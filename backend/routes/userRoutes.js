const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Listar todos os usuários (apenas admin/gerente)
router.get('/', authenticateToken, authorizeRoles('admin', 'gerente'), (req, res) => userController.list(req, res));

// Buscar usuário por ID (apenas admin/gerente)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'gerente'), (req, res) => userController.getById(req, res));

// Atualizar usuário (apenas admin/gerente)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'gerente'), (req, res) => userController.update(req, res));

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => userController.delete(req, res));

module.exports = router;
