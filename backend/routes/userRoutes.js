const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Listar todos os usuários (qualquer usuário autenticado pode ver, mas apenas admin/gerente podem editar/deletar)
router.get('/', authenticateToken, (req, res) => userController.list(req, res));

// Listar vendedores (qualquer usuário autenticado - para uso em metas, etc)
router.get('/sellers', authenticateToken, (req, res) => userController.listSellers(req, res));

// Minha conta - buscar perfil próprio
router.get('/me', authenticateToken, (req, res) => userController.getMe(req, res));

// Minha conta - atualizar perfil próprio
router.put('/me', authenticateToken, (req, res) => userController.updateMe(req, res));

// Minha conta - atualizar avatar
router.put('/me/avatar', authenticateToken, (req, res) => userController.updateAvatar(req, res));

// Buscar usuário por ID (qualquer usuário autenticado)
router.get('/:id', authenticateToken, (req, res) => userController.getById(req, res));

// Atualizar usuário (qualquer usuário autenticado pode editar)
router.put('/:id', authenticateToken, (req, res) => userController.update(req, res));

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => userController.delete(req, res));

module.exports = router;
