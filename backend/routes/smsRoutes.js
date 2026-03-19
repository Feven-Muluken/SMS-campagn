const express = require('express');
const router = express.Router();
const {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS,
  previewGeoAudience,
  sendGeoSMS,
  getDeliveryStatus,
  receiveInboundSMS,
} = require('../controllers/smsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// Provider webhook: inbound replies from customers.
router.post('/inbound', receiveInboundSMS);

router.post('/send', authMiddleware, checkRole(['admin', 'staff', 'viewer']), sendCampaignMessages);
router.post('/send-group', authMiddleware, checkRole(['admin', 'staff']), sendGroupSMS);
router.post('/send-contacts', authMiddleware, checkRole(['admin', 'staff']), sendContactsSMS);
router.post('/geo/preview', authMiddleware, checkRole(['admin', 'staff']), previewGeoAudience);
router.post('/geo/send', authMiddleware, checkRole(['admin', 'staff']), sendGeoSMS);
router.get('/status', authMiddleware, checkRole(['admin', 'staff', 'viewer']), getDeliveryStatus);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router;