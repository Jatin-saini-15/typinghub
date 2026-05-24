const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  forgotPassword, 
  resetPassword,
  logout,
  checkAuth,
  refreshToken,
  verifyResetToken,
  requestOtp,
  verifyOtp,
  resetPasswordWithOtp
} = require('../controllers/userAuthController');
const userAuthMiddleware = require('../middleware/auth');
const {
  userLoginLimiter,
  userRegisterLimiter,
  passwordResetLimiter,
  otpLimiter,
} = require('../middleware/rateLimiters');

// Public routes
router.post('/register', userRegisterLimiter, register);
router.post('/login', userLoginLimiter, login);
router.post('/refresh-token', refreshToken);

// OTP-based password reset
router.post('/request-otp', otpLimiter, requestOtp);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/reset-password-otp', passwordResetLimiter, resetPasswordWithOtp);

// Protected routes
router.post('/logout', userAuthMiddleware, logout);
router.get('/check-auth', userAuthMiddleware, checkAuth);

module.exports = router; 