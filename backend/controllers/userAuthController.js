const User = require('../models/User');
const bcrypt = require('bcryptjs');
const {
  hashPassword,
  generateTokens,
  setCookies,
  validatePasswordStrength,
  formatAuthResponse,
  formatErrorResponse,
  sendResetEmail,
  generateResetToken,
  generateOTP,
  sendOtpEmail
} = require('../utils/authUtils');
const jwt = require('jsonwebtoken');

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Validate required fields
    if (!name || !password) {
      return res.status(400).json(formatErrorResponse('Name and password are required'));
    }

    // Check if either email or mobile is provided
    if (!email && !mobile) {
      return res.status(400).json(formatErrorResponse('Either email or mobile number is required'));
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(formatErrorResponse('Invalid email format'));
      }
    }

    // Validate mobile format if provided
    if (mobile) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json(formatErrorResponse('Invalid mobile number format'));
      }
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json(formatErrorResponse(passwordCheck.message));
    }

    // Check if user already exists by email or mobile
    let existingUser = null;
    if (email) {
      existingUser = await User.findOne({ email });
    }
    if (!existingUser && mobile) {
      existingUser = await User.findOne({ mobile });
    }

    if (existingUser) {
      return res.status(400).json(formatErrorResponse('User with this email or mobile already exists'));
    }

    // Create new user (password will be hashed by the pre-save hook)
    const newUser = new User({
      name,
      email,
      mobile,
      password: password, // Plain password - will be hashed by pre-save hook
      registrationDate: new Date()
    });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser._id, 'user');

    // Set refresh token cookie
    setCookies(res, refreshToken);

    // Send response
    res.status(201).json(formatAuthResponse(newUser, accessToken, 'user'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    // Validate input
    if (!password) {
      return res.status(400).json(formatErrorResponse('Please provide password'));
    }

    if (!email && !mobile) {
      return res.status(400).json(formatErrorResponse('Please provide email or mobile number'));
    }

    // Check for user by email or mobile
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobile) {
      user = await User.findOne({ mobile });
    }

    if (!user) {
      // Run dummy bcrypt to prevent timing attacks that reveal whether account exists
      await bcrypt.compare(password, '$2b$10$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json(formatErrorResponse('Invalid credentials', 401));
    }

    // Check password using User model's comparePassword method
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json(formatErrorResponse('Invalid credentials', 401));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, 'user', user.tokenVersion || 0);

    // Set refresh token cookie
    setCookies(res, refreshToken);

    // Send response
    res.status(200).json(formatAuthResponse(user, accessToken, 'user'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Forgot password (OTP-based)
const forgotPassword = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email && !mobile) {
      return res.status(400).json(formatErrorResponse('Please provide an email or mobile number'));
    }
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobile) {
      user = await User.findOne({ mobile });
    }
    if (!user) {
      // Always send same response regardless of whether account exists (prevents enumeration)
      return res.status(200).json({
        success: true,
        message: 'If this account exists, an OTP has been sent to your email.'
      });
    }
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpVerified = false;
    await user.save();
    // Send OTP via email (or SMS if implemented)
    if (user.email) {
      await sendOtpEmail(user.email, otp);
    }
    // TODO: Add SMS sending if mobile is present and SMS support is added
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. (Mobile SMS not implemented yet)'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, mobile, otp } = req.body;
    if (!otp || (!email && !mobile)) {
      return res.status(400).json({ success: false, message: 'Please provide OTP and email or mobile' });
    }
    let user = null;
    if (email) user = await User.findOne({ email });
    else if (mobile) user = await User.findOne({ mobile });
    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    user.otpVerified = true;
    await user.save();
    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password with OTP
const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, mobile, otp, newPassword } = req.body;
        const passwordCheck = validatePasswordStrength(newPassword);
        if (!passwordCheck.valid) {
          return res.status(400).json({ success: false, message: passwordCheck.message });
        }

    if (!otp || !newPassword || (!email && !mobile)) {
      return res.status(400).json({ success: false, message: 'Please provide OTP, new password, and email or mobile' });
    }
    let user = null;
    if (email) user = await User.findOne({ email });
    else if (mobile) user = await User.findOne({ mobile });
    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (!user.otpVerified) {
      return res.status(400).json({ success: false, message: 'OTP not verified' });
    }
    user.password = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerified = false;
    await user.save();
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password with OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { tokenVersion: 1 }
      });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Check auth status
const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Check auth error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json(formatErrorResponse('No refresh token provided'));
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json(formatErrorResponse('User not found'));
    }

    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json(formatErrorResponse('Invalid refresh token'));
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id, 'user', user.tokenVersion || 0);
    setCookies(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(formatErrorResponse('Invalid refresh token'));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(formatErrorResponse('Refresh token expired'));
    }
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// Request OTP for password reset
const requestOtp = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email && !mobile) {
      return res.status(400).json({ success: false, message: 'Please provide an email or mobile number' });
    }
    let user = null;
    if (email) user = await User.findOne({ email });
    else if (mobile) user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpVerified = false;
    await user.save();
    // Send OTP (email only for now)
    if (user.email) await sendOtpEmail(user.email, otp);
    // Mock: Simulate SMS sending for mobile
    if (user.mobile && process.env.NODE_ENV === 'development') {
      // OTP printed only in dev when no real SMS provider is configured
      process.stdout.write(`[MOCK SMS] OTP for ${user.mobile}: ${otp}\n`);
      // In production, integrate with SMS provider here
    }
    res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPasswordWithOtp,
  verifyOtp,
  logout,
  checkAuth,
  refreshToken,
  requestOtp
}; 