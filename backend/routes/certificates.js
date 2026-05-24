const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const auth = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Generate certificate (requires auth)
router.post('/generate', auth, certificateController.generateCertificate);

// Download certificate (public - verificationCode acts as access token)
router.get('/download/:certificateId', certificateController.downloadCertificate);

// Verify certificate (public - for external verification links)
router.get('/verify/:verificationCode', certificateController.verifyCertificate);

// Get user certificate - requires auth; user can only fetch their own
router.get('/user/:userId', auth, certificateController.getUserCertificate);

// List all certificates - admin only
router.get('/all', verifyAdmin, certificateController.getAllCertificates);

module.exports = router; 