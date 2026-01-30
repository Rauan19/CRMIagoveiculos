const express = require('express')
const router = express.Router()
const pendenciaController = require('../controllers/pendenciaController')
const { authenticateToken } = require('../middleware/auth')

router.get('/', authenticateToken, (req, res) => pendenciaController.list(req, res))
router.get('/:id', authenticateToken, (req, res) => pendenciaController.getById(req, res))
router.post('/', authenticateToken, (req, res) => pendenciaController.create(req, res))
router.put('/:id', authenticateToken, (req, res) => pendenciaController.update(req, res))
router.delete('/:id', authenticateToken, (req, res) => pendenciaController.delete(req, res))

module.exports = router
