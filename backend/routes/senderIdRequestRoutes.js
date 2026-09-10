const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const {
	createSenderIdRequest,
	listMySenderIdRequests,
	listPendingSenderIdRequests,
	listAllSenderIdRequests,
	reviewSenderIdRequest,
	removeCompanySenderId,
	listApprovedCompanySenderIds,
} = require('../controllers/senderIdRequestController');

router.post('/', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), createSenderIdRequest);
router.get('/my', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), listMySenderIdRequests);
router.get('/approved', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), listApprovedCompanySenderIds);

router.get('/pending', authMiddleware, checkRole('admin'), listPendingSenderIdRequests);
router.get('/all', authMiddleware, checkRole('admin'), listAllSenderIdRequests);
router.patch('/:id/review', authMiddleware, checkRole('admin'), reviewSenderIdRequest);
router.delete('/sender-id/:senderId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), removeCompanySenderId);

module.exports = router;
