const express = require('express');
const router = express.Router();
const { generateText } = require('../controllers/aiController');
const { aiLimiter } = require('../middleware/rateLimiters');

// AI Text Generation Route
router.post('/generate-text', aiLimiter, generateText);

module.exports = router; 