const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership } = require('../middleware/companyAuthMiddleware');
const {
	createSenderIdRequest,
	listMySenderIdRequests,
	listPendingSenderIdRequests,
	reviewSenderIdRequest,
	removeCompanySenderId,
} = require('../controllers/senderIdRequestController');

router.post('/', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), createSenderIdRequest);
router.get('/my', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), listMySenderIdRequests);

router.get('/pending', authMiddleware, checkRole('admin'), listPendingSenderIdRequests);
router.patch('/:id/review', authMiddleware, checkRole('admin'), reviewSenderIdRequest);
router.delete('/sender-id/:senderId', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), removeCompanySenderId);

module.exports = router;
