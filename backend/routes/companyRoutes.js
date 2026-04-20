const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getManageableCompanies,
  updateCompany,
  listCompanyUsers,
  createCompanyUserManaged,
  updateCompanyUserManaged,
} = require('../controllers/companyManagementController');

router.get('/manageable', authMiddleware, getManageableCompanies);
router.put('/:id', authMiddleware, updateCompany);
router.get('/:id/users', authMiddleware, listCompanyUsers);
router.post('/:id/users', authMiddleware, createCompanyUserManaged);
router.put('/:id/users/:membershipId', authMiddleware, updateCompanyUserManaged);

module.exports = router;
