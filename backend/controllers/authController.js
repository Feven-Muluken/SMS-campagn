const User = require('../models/User');
const jwt = require('jsonwebtoken');


const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d'});
    res.status(201).json({ message: 'User created successfully', user , token });

  } catch (error) {
    next(error);
  }
};


const login = async (req, res, next) => {
  try{
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token });
  } catch (error){
    next(error);
  }
};


module.exports = { register, login };



/*const User = require('../models/User');
const jwt = require('jsonwebtoken');


const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role });

    // Include role (and basic identity) in the JWT so the frontend can do role-based routing
    const tokenPayload = { id: user._id, role: user.role, email: user.email, name: user.name };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'User created successfully', user, token });

  } catch (error) {
    next(error);
  }
};


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Include role (and basic identity) in the JWT so the frontend can decode role
    const tokenPayload = { id: user._id, role: user.role, email: user.email, name: user.name };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user: { id: user._id, role: user.role, email: user.email, name: user.name } });
  } catch (error) {
    next(error);
  }
};


module.exports = { register, login };*/