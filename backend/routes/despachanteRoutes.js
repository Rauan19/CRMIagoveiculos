const express = require('express')
const router = express.Router()
const despachanteController = require('../controllers/despachanteController')
const { authenticateToken } = require('../middleware/auth')

router.get('/', authenticateToken, (req, res) => despachanteController.list(req, res))
router.get('/:id', authenticateToken, (req, res) => despachanteController.getById(req, res))
router.post('/', authenticateToken, (req, res) => despachanteController.create(req, res))
router.put('/:id', authenticateToken, (req, res) => despachanteController.update(req, res))
router.delete('/:id', authenticateToken, (req, res) => despachanteController.delete(req, res))

module.exports = router
