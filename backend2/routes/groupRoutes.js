const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  createGroup, addContactToGroup, sendGroupSMS,
  getAllGroups, updateGroup, deleteGroup
} = require('../controllers/groupController');

router.get('/', authMiddleware, getAllGroups);
router.post('/create', authMiddleware, checkRole(['admin', 'staff']), createGroup);
router.put('/:groupId', authMiddleware, checkRole(['admin', 'staff']), updateGroup);
router.post('/:groupId/add', authMiddleware, checkRole(['admin', 'staff']), addContactToGroup);
router.post('/:groupId/send', authMiddleware, checkRole(['admin']), sendGroupSMS);
router.delete('/:groupId', authMiddleware, checkRole(['admin', 'staff']), deleteGroup);

module.exports = router;