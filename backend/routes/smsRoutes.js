const express = require('express');
const router = express.Router();
const { sendCampaignMessages } = require('../controllers/smsController');
const {authMiddleware, checkRole} = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, checkRole(['admin', 'staff', 'viwer']), sendCampaignMessages);

// router.get('/campaign/:name/stats', authMiddleware, checkRole(['admin', 'staff']), stats);


module.exports = router ;