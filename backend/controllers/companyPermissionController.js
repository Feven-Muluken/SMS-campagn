const { CompanyPermission } = require('../models');
const { canManageCompany } = require('./companyManagementController');
const { normalizePermissionDependencies } = require('../utils/companyPermissionDependencies');

const COMPANY_PERMISSION_KEYS = [
  'dashboard.view',
  'campaign.view',
  'campaign.create',
  'campaign.manage',
  'campaign.schedule',
  'campaign.send',
  'group.send',
  'contact.send',
  'contact.view',
  'contact.create',
  'contact.manage',
  'group.view',
  'group.create',
  'group.manage',
  'user.manage',
  'sms.send',
  'delivery.view',
  'appointment.view',
  'appointment.manage',
  'inbox.view',
  'inbox.reply',
  'inbox.assign',
  'inbox.status',
  'geo.send',
  'billing.send',
  'company.manage',
];

const REQUIRED_COMPANY_PERMISSIONS = [
  'dashboard.view',
  'campaign.view',
  'campaign.create',
  'campaign.schedule',
  'contact.view',
  'contact.create',
  'group.view',
  'group.create',
  'inbox.view',
  'inbox.reply',
];

const sanitizeRows = (rows = []) => {
  if (!Array.isArray(rows)) return [];
  const map = new Map();
  for (const row of rows) {
    const key = String(row?.permissionKey || '');
    if (!COMPANY_PERMISSION_KEYS.includes(key) || REQUIRED_COMPANY_PERMISSIONS.includes(key)) continue;
    map.set(key, {
      permissionKey: key,
      isEnabled: !!row?.isEnabled,
      config: row?.config && typeof row.config === 'object' ? row.config : {},
    });
  }
  const enabled = normalizePermissionDependencies(
    [...map.values()].filter((row) => row.isEnabled).map((row) => row.permissionKey),
    REQUIRED_COMPANY_PERMISSIONS,
  );
  const enabledSet = new Set(enabled);
  return [...map.values()].map((row) => ({ ...row, isEnabled: enabledSet.has(row.permissionKey) }));
};

const getCompanyPermissions = async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const rows = await CompanyPermission.findAll({ where: { companyId } });

    return res.json({
      data: rows.filter((row) => !REQUIRED_COMPANY_PERMISSIONS.includes(row.permissionKey)),
    });
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
    return res.json({
      message: 'Permissions updated',
      data: rows.filter((row) => !REQUIRED_COMPANY_PERMISSIONS.includes(row.permissionKey)),
    });
  } catch (error) {
    console.error('Update company permissions error:', error);
    return res.status(500).json({ message: 'Failed to update company permissions' });
  }
};

module.exports = { getCompanyPermissions, updateCompanyPermissions };
