const express = require('express');
const router = express.Router();
const {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS,
  sendToPhone,
  sendTagsSMS,
  getDeliveryStatus,
  reportLiveLocation,
  verifyLiveLocationIngestKey,
  receiveInboundSMS,
  receiveDeliveryReport,
} = require('../controllers/smsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const { verifyAtWebhook } = require('../middleware/atWebhookSecret');

router.post(
  '/send',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff', 'viewer']),
  requireCompanyPermission('campaign.send'),
  sendCampaignMessages
);
router.post(
  '/send-group',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('sms.send'),
  sendGroupSMS
);
router.post(
  '/send-contacts',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('sms.send'),
  sendContactsSMS
);
router.post('/send-phone', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), sendToPhone);
router.post('/send-tags', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), sendTagsSMS);
// Mobile app: POST with X-Live-Location-Key header (must match LIVE_LOCATION_INGEST_KEY).
router.post('/live-location/ping', verifyLiveLocationIngestKey, reportLiveLocation);

// Provider webhooks (Africa's Talking, MobileSMS.io, or any vendor posting JSON to these URLs).
// Optional shared secret: SMS_WEBHOOK_SECRET / MOBILESMS_IO_WEBHOOK_SECRET / AT_WEBHOOK_SECRET
// Send via header x-at-webhook-secret, x-webhook-secret, x-sms-webhook-secret, or ?secret=
router.post('/inbound', verifyAtWebhook, receiveInboundSMS);
router.post('/delivery-report', verifyAtWebhook, receiveDeliveryReport);
router.post('/webhooks/inbound', verifyAtWebhook, receiveInboundSMS);
router.post('/webhooks/delivery-report', verifyAtWebhook, receiveDeliveryReport);
router.get(
  '/status',
  authMiddleware,
  requireCompanyMembership,
  requireCompanyPermission('delivery.view'),
  checkRole(['admin', 'staff', 'viewer']),
  getDeliveryStatus
);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router;