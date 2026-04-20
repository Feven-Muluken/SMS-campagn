const express = require( 'express' );
const router =  express.Router();
const { createCampaign, getAllCampaigns, getCampaignById, updateCampaign, deleteCampaign } = require( '../controllers/campaignController' );
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');
// const { route } = require('./campaignRoutes');

// Staff use the same UI as admin; controllers scope by createdById for non-admins.
router.post('/create', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('campaign.send'), createCampaign);
router.get('/', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), requireCompanyPermission('campaign.view'), getAllCampaigns);
router.get('/:id', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff', 'viewer']), requireCompanyPermission('campaign.view'), getCampaignById);
router.put('/:id', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('campaign.send'), updateCampaign);
router.delete('/:id', authMiddleware, requireCompanyMembership, checkRole(['admin', 'staff']), requireCompanyPermission('campaign.send'), deleteCampaign);

module.exports = router;