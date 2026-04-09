const jwt = require('jsonwebtoken');

exports.protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admins only' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};



exports.adminOnly = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'admin') {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};