const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if user account is active
      if (req.user.status !== 'active') {
        return res.status(401).json({ message: 'Account is not active' });
      }

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only access
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Manager or Admin access
const managerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized - manager or admin required' });
  }
};

// Check if user can access specific deal (owner, assigned user, or admin/manager)
const canAccessDeal = async (req, res, next) => {
  try {
    const Deal = require('../models/Deal');
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Admin and managers can access all deals
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      req.deal = deal;
      return next();
    }

    // Check if user is the owner or assigned to the deal
    const canAccess = deal.assignedTo.includes(req.user._id) || 
                     deal.createdBy.toString() === req.user._id.toString();

    if (!canAccess) {
      return res.status(403).json({ message: 'Not authorized to access this deal' });
    }

    req.deal = deal;
    next();
  } catch (error) {
    console.error('Deal access check failed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rate limiting for login attempts
const loginRateLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user && user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ 
        message: `Account locked. Try again in ${lockTimeRemaining} minutes.` 
      });
    }

    next();
  } catch (error) {
    console.error('Login rate limit check failed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  protect,
  admin,
  managerOrAdmin,
  canAccessDeal,
  loginRateLimit
};