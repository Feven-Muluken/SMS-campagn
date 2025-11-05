const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { admin, getAllUsers, updateUser, deleteUser, getDashboardStats } = require('../controllers/adminController');
const campaign = require('./campaignRoutes')
const app = express()
app.use(express.json());

router.get('/', authMiddleware, checkRole(['admin']),  getDashboardStats)
router.get('/users', authMiddleware, checkRole(['admin']), getAllUsers);
router.put('/users/:id', authMiddleware, checkRole(['admin']), updateUser);
router.delete('/users/:id', authMiddleware, checkRole(['admin']), deleteUser);
router.use('/campaign', authMiddleware, checkRole(['admin']), campaign);

module.exports = router;