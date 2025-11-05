const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({
    message: 'No token provided'
  });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const checkRole = ( roles ) => ( req, res, next ) => {
  if (!roles.includes(req.user.role)){
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};


module.exports = { authMiddleware, checkRole} ;