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

// router.get("/profile", verifyTokenyyy, (req, res) => {
//   res.json({ message: "Profile data", user: req.user });
// });

module.exports = router;
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZGFAZXhhbXBsZS5jb20iLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwiaWF0IjoxNzY3MTc2NzYyLCJleHAiOjE3Njc3ODE1NjJ9.wRTSebyT9meghh8L9KuzZ-CH9-BsE4jKoo1wdSm_8zU
// {
//     "message": "User created successfully",
//     "user": {
//         "id": 1,
//         "name": "Ada Lovelace",
//         "email": "ada@example.com",
//         "role": "admin",
//         "phoneNumber": "+15551234567",
//         "updatedAt": "2025-12-31T10:26:02.575Z",
//         "createdAt": "2025-12-31T10:26:02.575Z"
//     },

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Niwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZGRhQGV4YW1wbGUuY29tIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTc2OTkzMTk0NCwiZXhwIjoxNzcwNTM2NzQ0fQ.CNuO32IzZ48EU-ZvhwcYylpv5IteJaiFNu9z_bv7UOg
//     "name": "Ada Lovelace",
//     "email": "adda@example.com",
//     "password": "ada@example.com",
//     "role": "admin",
//     "phoneNumber": "+15551234567"