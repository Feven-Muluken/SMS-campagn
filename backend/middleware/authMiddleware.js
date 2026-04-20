const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('authMiddleware: JWT_SECRET is not set');
    return res.status(500).json({ message: 'Server misconfiguration' });
  }
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({
    message: 'No token provided'
  });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const checkRole = (roles) => (req, res, next) => {
  const allowed = (Array.isArray(roles) ? roles : [roles]).map((r) => String(r || '').toLowerCase());
  const actual = String(req.user?.role || '').toLowerCase();
  if (!allowed.includes(actual)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};


module.exports = { authMiddleware, checkRole} ;