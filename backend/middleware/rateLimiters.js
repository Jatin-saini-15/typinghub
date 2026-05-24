const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

const adminLoginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

const userLoginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

const adminRegisterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts. Please try again later.',
});

const userRegisterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 25,
  message: 'Too many registration attempts. Please try again later.',
});

const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
});

const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Too many OTP requests. Please try again later.',
});

const paymentLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many payment requests. Please try again shortly.',
});

const aiLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many AI requests. Please try again later.',
});

const blogInteractionLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many requests. Please try again later.',
});

module.exports = {
  adminLoginLimiter,
  userLoginLimiter,
  adminRegisterLimiter,
  userRegisterLimiter,
  passwordResetLimiter,
  otpLimiter,
  paymentLimiter,
  aiLimiter,
  blogInteractionLimiter,
};
