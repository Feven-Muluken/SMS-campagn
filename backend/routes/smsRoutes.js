const express = require('express');
const router = express.Router();
const {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS,
  sendToPhone,
  sendTagsSMS,
  getDeliveryStatus,
  getInboxMessages,
  listInboxConversations,
  getInboxConversationMessages,
  markInboxConversationRead,
  updateInboxConversation,
  deleteInboxConversation,
  listInboxStaff,
  listInboxContacts,
  startInboxConversation,
  replyToInboxConversation,
  reportLiveLocation,
  verifyLiveLocationIngestKey,
  receiveInboundSMS,
  receiveDeliveryReport,
  previewGeoAudience,
  sendGeoSMS,
  getProviderOptions,
} = require('../controllers/smsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
const { verifyAtWebhook } = require('../middleware/atWebhookSecret');
const {
  listInternalConversations,
  listInternalRecipients,
  createInternalConversation,
  getInternalMessages,
  sendInternalMessage,
  updateInternalConversation,
  deleteInternalConversation,
} = require('../controllers/internalInboxController');

router.get('/providers', authMiddleware, requireCompanyMembership, getProviderOptions);
router.get('/internal-inbox/conversations', authMiddleware, listInternalConversations);
router.get('/internal-inbox/recipients', authMiddleware, listInternalRecipients);
router.post('/internal-inbox/conversations', authMiddleware, createInternalConversation);
router.get('/internal-inbox/conversations/:conversationId/messages', authMiddleware, getInternalMessages);
router.post('/internal-inbox/conversations/:conversationId/messages', authMiddleware, sendInternalMessage);
router.patch('/internal-inbox/conversations/:conversationId', authMiddleware, updateInternalConversation);
router.delete('/internal-inbox/conversations/:conversationId', authMiddleware, deleteInternalConversation);

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
  requireCompanyPermission('group.send'),
  sendGroupSMS
);
router.post(
  '/send-contacts',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('contact.send'),
  sendContactsSMS
);
router.post('/send-phone', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), sendToPhone);
router.post('/send-tags', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('sms.send'), sendTagsSMS);
router.post('/geo/preview', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('geo.send'), previewGeoAudience);
router.post('/geo/send', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('geo.send'), sendGeoSMS);
router.get('/inbox', authMiddleware, requireCompanyMembership, getInboxMessages);
router.get('/inbox/conversations', authMiddleware, requireCompanyMembership, listInboxConversations);
router.get('/inbox/staff', authMiddleware, requireCompanyMembership, listInboxStaff);
router.get('/inbox/contacts', authMiddleware, requireCompanyMembership, listInboxContacts);
router.post('/inbox/conversations', authMiddleware, requireCompanyMembership, startInboxConversation);
router.get('/inbox/conversations/:conversationId/messages', authMiddleware, requireCompanyMembership, getInboxConversationMessages);
router.post('/inbox/conversations/:conversationId/read', authMiddleware, requireCompanyMembership, markInboxConversationRead);
router.patch('/inbox/conversations/:conversationId', authMiddleware, requireCompanyMembership, updateInboxConversation);
router.delete('/inbox/conversations/:conversationId', authMiddleware, requireCompanyMembership, deleteInboxConversation);
router.post('/inbox/conversations/:conversationId/reply', authMiddleware, requireCompanyMembership, replyToInboxConversation);
router.post('/inbox/reply', authMiddleware, requireCompanyMembership, (req, res) => {
  req.body.contactIds = [req.body.contactId];
  req.body.channel = 'inbox';
  return sendContactsSMS(req, res);
});
router.post('/inbox/reply-group', authMiddleware, requireCompanyMembership, requireCompanyPermission('inbox.reply'), (req, res) => {
  req.body.channel = 'inbox';
  return sendGroupSMS(req, res);
});
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
router.get('/summary', authMiddleware, requireCompanyMembership, requireCompanyPermission('delivery.view'), checkRole(['admin', 'staff', 'viewer']), getDeliveryStatus);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router;
