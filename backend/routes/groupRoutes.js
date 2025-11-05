const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  createGroup, addContactToGroup, sendGroupSMS,
  getAllGroups,
} = require('../controllers/groupController');

router.get('/', authMiddleware, getAllGroups);
router.post('/create', authMiddleware, checkRole(['admin', 'staff']),  createGroup);
router.post('/groupId/add', authMiddleware, checkRole(['admin', 'staff']), addContactToGroup);
router.post('/:groupID/send', authMiddleware, sendGroupSMS);

module.exports = router;