const mongoose = require('mongoose');
const User = require('../models/User');
const Card = require('../models/Card');

// POST /api/users/:userId/purchase
exports.purchaseCourse = async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;

  // Verify authenticated user is purchasing for themselves only
  if (!req.user || req.user._id.toString() !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.purchasedCourses) user.purchasedCourses = [];
    if (!user.purchasedCourses.map(id => id.toString()).includes(courseId)) {
      user.purchasedCourses.push(courseId);
      await user.save();
    }
    res.json({ message: 'Course purchased' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/users/:userId/purchased-courses
exports.getPurchasedCourses = async (req, res) => {
  const { userId } = req.params;

  // Verify authenticated user is viewing their own purchases only
  if (!req.user || req.user._id.toString() !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(userId).populate('purchasedCourses');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.purchasedCourses || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}; 