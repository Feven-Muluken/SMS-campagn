const { CompanyPermission } = require('../models');
const { canManageCompany } = require('./companyManagementController');

const COMPANY_PERMISSION_KEYS = [
  'dashboard.view',
  'campaign.view',
  'campaign.send',
  'contact.view',
  'contact.manage',
  'group.view',
  'group.manage',
  'user.manage',
  'sms.send',
  'delivery.view',
  'appointment.view',
  'appointment.manage',
  'inbox.view',
  'inbox.reply',
  'geo.send',
  'billing.send',
  'company.manage',
];

const sanitizeRows = (rows = []) => {
  if (!Array.isArray(rows)) return [];
  const map = new Map();
  for (const row of rows) {
    const key = String(row?.permissionKey || '');
    if (!COMPANY_PERMISSION_KEYS.includes(key)) continue;
    map.set(key, {
      permissionKey: key,
      isEnabled: !!row?.isEnabled,
      config: row?.config && typeof row.config === 'object' ? row.config : {},
    });
  }
  return [...map.values()];
};

const getCompanyPermissions = async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const rows = await CompanyPermission.findAll({ where: { companyId } });

    return res.json({ data: rows });
  } catch (error) {
    console.error('Get company permissions error:', error);
    return res.status(500).json({ message: 'Failed to get company permissions' });
  }
};

const updateCompanyPermissions = async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const normalized = sanitizeRows(req.body?.permissions || []);

    for (const row of normalized) {
      await CompanyPermission.upsert({
        companyId,
        permissionKey: row.permissionKey,
        isEnabled: row.isEnabled,
        config: row.config,
        grantedById: req.user?.id || null,
      });
    }

    const rows = await CompanyPermission.findAll({ where: { companyId } });
    return res.json({ message: 'Permissions updated', data: rows });
  } catch (error) {
    console.error('Update company permissions error:', error);
    return res.status(500).json({ message: 'Failed to update company permissions' });
  }
};

module.exports = { getCompanyPermissions, updateCompanyPermissions };
