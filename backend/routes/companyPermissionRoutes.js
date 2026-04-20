const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { getCompanyPermissions, updateCompanyPermissions } = require('../controllers/companyPermissionController');

router.get('/:companyId', authMiddleware, getCompanyPermissions);
router.put('/:companyId', authMiddleware, updateCompanyPermissions);

module.exports = router;
