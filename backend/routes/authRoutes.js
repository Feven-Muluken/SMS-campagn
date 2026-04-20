const express = require('express');
const router = express.Router();

const { register, login, switchCompany, forgotPassword, resetPassword } = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  res.json({ message: 'Auth API is running' });
});

router.post('/admin/register', authMiddleware, checkRole(['admin']),  register);

router.post('/login', login);
router.post('/switch-company', authMiddleware, switchCompany);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

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