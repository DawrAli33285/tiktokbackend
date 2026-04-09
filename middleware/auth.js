const jwt = require('jsonwebtoken');
const User = require('../models/user');
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role isPremium');

    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = { id: decoded.id, role: user.role, isPremium: user.isPremium };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role isPremium');
    req.user = user ? { id: decoded.id, role: user.role, isPremium: user.isPremium } : null;
  } catch {
    req.user = null;
  }

  next();
};

  exports.adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admins only' });
    }
    next();
  };