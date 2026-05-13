const express = require('express');
const { login, validateToken } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', login);

// Validate token endpoint
router.get('/validate', authMiddleware, validateToken);

module.exports = router;
