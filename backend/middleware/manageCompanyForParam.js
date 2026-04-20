const { canManageCompany } = require('../controllers/companyManagementController');

/**
 * Authorize routes keyed by :companyId in the URL (e.g. /company-permissions/:companyId).
 * Uses the same rules as company user management — not X-Company-Id alone — so managers
 * can act on the company selected in the UI even when their active context differs.
 */
const manageCompanyForParam = async (req, res, next) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!companyId) {
      return res.status(400).json({ message: 'Invalid companyId' });
    }
    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    next();
  } catch (err) {
    console.error('manageCompanyForParam:', err);
    return res.status(500).json({ message: 'Failed to verify company access' });
  }
};

module.exports = { manageCompanyForParam };
