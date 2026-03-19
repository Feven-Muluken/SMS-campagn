const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');

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
    // const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
    const rememberMe = req.body.rememberMe || false;
    const expiresIn = rememberMe ? '30d' : '7d';

    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET, { expiresIn }
    );

    res.json({ 
      token, 
      user: toSafeUser(user)
    });

  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been generated.',
      });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      purpose: 'password-reset',
    };

    const resetToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    const response = {
      message: 'If an account with that email exists, a password reset link has been generated.',
    };

    if (!emailResult.sent) {
      response.message = 'Reset link generated, but email sending is not configured on the server.';
    }

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
      response.resetUrl = resetUrl;
      response.emailSent = emailResult.sent;
    }

    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return next(error);
  }
};

// const setRememberMe


module.exports = { register, login, forgotPassword, resetPassword };