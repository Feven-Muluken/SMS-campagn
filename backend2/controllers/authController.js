const jwt = require('jsonwebtoken');
const { User } = require('../models');

const toSafeUser = (user) => {
  const plain = user?.toJSON ? user.toJSON() : user;
  if (plain && plain.password) delete plain.password;
  return plain;
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role, phoneNumber });
    const tokenPayload = { id: user.id, role: user.role, email: user.email, name: user.name };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'User created successfully', user: toSafeUser(user), token });

  } catch (error) {
    next(error);
  }
};


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokenPayload = { id: user.id, role: user.role, email: user.email, name: user.name };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};


module.exports = { register, login };