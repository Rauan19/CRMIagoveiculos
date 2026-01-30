const express = require('express')
const router = express.Router()
const sinalNegocioController = require('../controllers/sinalNegocioController')
const { authenticateToken } = require('../middleware/auth')

router.get('/', authenticateToken, (req, res) => sinalNegocioController.list(req, res))
router.get('/:id', authenticateToken, (req, res) => sinalNegocioController.getById(req, res))
router.post('/', authenticateToken, (req, res) => sinalNegocioController.create(req, res))
router.put('/:id', authenticateToken, (req, res) => sinalNegocioController.update(req, res))
router.delete('/:id', authenticateToken, (req, res) => sinalNegocioController.delete(req, res))

module.exports = router
