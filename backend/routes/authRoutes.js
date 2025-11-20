// // routes/authRoutes.js
// const express = require('express');
// const router = express.Router();
// const User = require('../models/User');
// const jwt = require('jsonwebtoken');

// // router.post('/login', async (req, res) => {
// //   const { email, password } = req.body;
// //   const user = await User.findOne({ email });
// //   if (!user || !(await user.matchPassword(password))) {
// //     return res.status(401).json({ message: 'Invalid credentials' });
// //   }

// //   const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
// //     expiresIn: '7d',
// //   });

// //   res.json({ token });
// // });


const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  res.json({ message: 'Auth API is running' });
  // res.send('atuh page');
});

router.post('/admin/register', authMiddleware, checkRole(['admin']), register);

router.post('/login', login);

// router.get("/profile", verifyToken, (req, res) => {
//   res.json({ message: "Profile data", user: req.user });
// });

module.exports = router;