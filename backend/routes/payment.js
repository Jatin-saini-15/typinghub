const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { paymentLimiter } = require('../middleware/rateLimiters');

// Create payment order
router.post('/create-order', paymentLimiter, paymentController.createPaymentOrder);

// Verify payment
router.post('/verify', paymentLimiter, paymentController.verifyPayment);

// Process competition payment
router.post('/competition', paymentLimiter, paymentController.processCompetitionPayment);

// Get payment status
router.get('/status/:paymentId', paymentLimiter, paymentController.getPaymentStatus);

module.exports = router;

