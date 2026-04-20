const express = require('express');
const router = express.Router();
const {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS,
  getDeliveryStatus
  reportLiveLocation,
  verifyLiveLocationIngestKey,
} = require('../controllers/smsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { loadCompanyContext } = require('../middleware/companyContextMiddleware');
const {
  requireCompanyApprovedForMessaging,
  requireCompanyPermissions,
} = require('../middleware/companyPermissionMiddleware');

router.post('/send', authMiddleware, checkRole(['admin', 'staff', 'viewer']), sendCampaignMessages);
router.post('/send-group', authMiddleware, checkRole(['admin', 'staff']), sendGroupSMS);
router.post('/send-contacts', authMiddleware, checkRole(['admin', 'staff']), sendContactsSMS);
router.post('/send-phone', authMiddleware, checkRole(['admin', 'staff']), sendToPhone);
router.post('/send-tags', authMiddleware, checkRole(['admin', 'staff']), sendTagsSMS);
// Mobile app: POST with X-Live-Location-Key header (must match LIVE_LOCATION_INGEST_KEY).
router.post('/live-location/ping', verifyLiveLocationIngestKey, reportLiveLocation);
router.get(
  '/status',
  authMiddleware,
  loadCompanyContext,
  requireCompanyPermissions('delivery.view'),
  checkRole(['admin', 'staff', 'viewer']),
  getDeliveryStatus
);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router;