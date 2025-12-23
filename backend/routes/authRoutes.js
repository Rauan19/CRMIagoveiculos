const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registro
router.post('/register', (req, res) => authController.register(req, res));

// Login
router.post('/login', (req, res) => authController.login(req, res));

// Refresh Token
router.post('/refresh', (req, res) => authController.refresh(req, res));

module.exports = router;
