const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config');

const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (!admin.isApproved) {
      return res.status(403).json({ message: 'Account not approved.' });
    }

    if ((admin.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Token is no longer valid.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      console.error('Auth middleware error:', error);
    }
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = { 
  verifyAdmin,
  requireAuth: verifyAdmin,
  requireAdmin: verifyAdmin
}; 