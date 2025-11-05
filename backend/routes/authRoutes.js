const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  res.json({ message: 'Auth API is running' });
  // res.send('atuh page');
});

router.post('/register', authMiddleware, checkRole(['admin']), register);

router.post('/login', login);

// router.get("/profile", verifyToken, (req, res) => {
//   res.json({ message: "Profile data", user: req.user });
// });

module.exports = router;