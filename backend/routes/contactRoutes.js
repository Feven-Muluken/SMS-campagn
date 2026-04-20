const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const {
  createContact,
  getAllContacts,
  updateContact,
  deleteContact
} = require('../controllers/contactController');

router.get('/', authMiddleware, requireCompanyMembership, requireCompanyPermission('contact.view'), getAllContacts);
router.post('/', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('contact.manage'), createContact);
router.put('/:id', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('contact.manage'), updateContact);
router.delete('/:id', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('contact.manage'), deleteContact);

module.exports = router;
