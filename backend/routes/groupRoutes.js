const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const {
  createGroup, addContactToGroup, sendGroupSMS,
  getAllGroups, updateGroup, deleteGroup
} = require('../controllers/groupController');

router.get('/', authMiddleware, requireCompanyMembership, requireCompanyPermission('group.view'), getAllGroups);
router.post('/create', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), createGroup);
router.put('/:groupId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), updateGroup);
router.post('/:groupId/add', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), addContactToGroup);
router.post('/:groupId/send', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), sendGroupSMS);
router.delete('/:groupId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), deleteGroup);

module.exports = router;