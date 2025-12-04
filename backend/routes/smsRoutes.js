const express = require('express');
const router = express.Router();
const {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS
} = require('../controllers/smsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, checkRole(['admin', 'staff', 'viewer']), sendCampaignMessages);
router.post('/send-group', authMiddleware, checkRole(['admin', 'staff']), sendGroupSMS);
router.post('/send-contacts', authMiddleware, checkRole(['admin', 'staff']), sendContactsSMS);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router;