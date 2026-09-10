const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const {
  createGroup, addContactToGroup, sendGroupSMS,
  getAllGroups, getGroupDeliveries, updateGroup, deleteGroup
} = require('../controllers/groupController');

router.get('/', authMiddleware, requireCompanyMembership, requireCompanyPermission('group.view'), getAllGroups);
router.post('/create', authMiddleware, requireCompanyMembership, requireCompanyPermission('group.create'), createGroup);
router.put('/:groupId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), updateGroup);
router.post('/:groupId/add', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), addContactToGroup);
router.post('/:groupId/send', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.send'), sendGroupSMS);
router.get('/:groupId/deliveries', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), requireCompanyPermission('delivery.view'), getGroupDeliveries);
router.delete('/:groupId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('group.manage'), deleteGroup);

module.exports = router;
