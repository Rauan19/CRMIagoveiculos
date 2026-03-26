const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const quitacaoController = require('../controllers/quitacaoController')

router.get('/', authenticateToken, (req, res) => quitacaoController.list(req, res))
router.get('/:id', authenticateToken, (req, res) => quitacaoController.getById(req, res))
router.delete('/:id', authenticateToken, (req, res) => quitacaoController.delete(req, res))

module.exports = router
