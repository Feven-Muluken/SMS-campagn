const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const {
  getManageableCompanies,
  getCompanySummary,
  getCompanyDashboard,
  updateCompany,
  listCompanyUsers,
  createCompanyUserManaged,
  updateCompanyUserManaged,
  deleteCompanyUserManaged,
} = require('../controllers/companyManagementController');

router.get('/manageable', authMiddleware, getManageableCompanies);
router.get('/:id/summary', authMiddleware, getCompanySummary);
router.get('/:id/dashboard', authMiddleware, requireCompanyMembership, requireCompanyPermission('dashboard.view'), getCompanyDashboard);
router.put('/:id', authMiddleware, updateCompany);
router.get('/:id/users', authMiddleware, listCompanyUsers);
router.post('/:id/users', authMiddleware, createCompanyUserManaged);
router.put('/:id/users/:membershipId', authMiddleware, updateCompanyUserManaged);
router.delete('/:id/users/:membershipId', authMiddleware, deleteCompanyUserManaged);

module.exports = router;
