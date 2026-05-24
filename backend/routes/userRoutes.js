const express = require('express');
const router = express.Router();
const User = require('../models/User');
const userAuthMiddleware = require('../middleware/auth');
const userController = require('../controllers/userController');

// NOTE: User registration and login are handled exclusively by /api/auth routes
// (userAuthController.js) which include rate limiting, httpOnly cookie tokens,
// and timing-attack protection. The duplicate endpoints previously here have been removed.

// Get user dashboard data
router.get('/dashboard', userAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      stats: user.stats,
      achievements: user.achievements
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Update user profile
router.put('/profile', userAuthMiddleware, async (req, res) => {
  try {
    const { name, mobile } = req.body;

    // Input validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
        return res.status(400).json({ message: 'Name must be between 1 and 100 characters' });
      }
    }
    if (mobile !== undefined) {
      if (typeof mobile !== 'string' || !/^\+?[\d\s\-()]{7,20}$/.test(mobile.trim())) {
        return res.status(400).json({ message: 'Invalid mobile number format' });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim().slice(0, 100);
    if (mobile) user.mobile = mobile.trim().slice(0, 20);

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Update user stats
router.put('/stats', userAuthMiddleware, async (req, res) => {
  try {
    const { typingAccuracy, mockTestsTaken } = req.body;

    // Input validation
    if (typingAccuracy !== undefined) {
      const acc = Number(typingAccuracy);
      if (!Number.isFinite(acc) || acc < 0 || acc > 100) {
        return res.status(400).json({ message: 'typingAccuracy must be a number between 0 and 100' });
      }
    }
    if (mockTestsTaken !== undefined) {
      const tests = Number(mockTestsTaken);
      if (!Number.isInteger(tests) || tests < 0) {
        return res.status(400).json({ message: 'mockTestsTaken must be a non-negative integer' });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stats) user.stats = {};
    if (typingAccuracy !== undefined) user.stats.typingAccuracy = Number(typingAccuracy);
    if (mockTestsTaken !== undefined) user.stats.mockTestsTaken = Number(mockTestsTaken);

    await user.save();

    res.json({
      message: 'Stats updated successfully',
      stats: user.stats
    });
  } catch (error) {
    console.error('Stats update error:', error);
    res.status(500).json({ message: 'Error updating stats' });
  }
});

// Purchase a course - authenticated, user can only purchase for themselves
router.post('/:userId/purchase', userAuthMiddleware, userController.purchaseCourse);
// Get purchased courses - authenticated, user can only view their own
router.get('/:userId/purchased-courses', userAuthMiddleware, userController.getPurchasedCourses);

module.exports = router; 