const express = require( 'express' );
const router =  express.Router();
const { createCampaign, getAllCampaigns, updateCampaign, deleteCampaign } = require( '../controllers/campaignController' );
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { route } = require('./campaignRoutes');

router.post('/create', authMiddleware, checkRole([ 'admin' ]), createCampaign);
router.get('/', authMiddleware, checkRole(['admin', 'staff']), getAllCampaigns);
router.put('/:id', authMiddleware, checkRole(['admin']), updateCampaign);
router.delete('/:id', authMiddleware, checkRole(['admin']), deleteCampaign);

module.exports = router;