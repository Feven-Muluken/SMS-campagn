const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  updateUser,
  deleteUser,
  getDashboardStats,
  getRecentActivity
} = require('../controllers/adminController');
const campaign = require('./campaignRoutes')
const group = require('./groupRoutes');

router.get('/stats', authMiddleware, checkRole(['admin']), getDashboardStats);
router.get('/recent-activity', authMiddleware, checkRole(['admin']), getRecentActivity);
router.get('/users', authMiddleware, checkRole(['admin']), getAllUsers);
router.put('/users/:id', authMiddleware, checkRole(['admin']), updateUser);
router.delete('/users/:id', authMiddleware, checkRole(['admin']), deleteUser);
router.use('/campaign', authMiddleware, checkRole(['admin']), campaign);
router.use('/group', authMiddleware, checkRole(['admin']), group);

module.exports = router;