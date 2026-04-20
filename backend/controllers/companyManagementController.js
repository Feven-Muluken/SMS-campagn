const { Op } = require('sequelize');
const { Company, CompanyUser, CompanyPermission, User } = require('../models');

const ALLOWED_COMPANY_PERMISSIONS = [
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

const ROLE_PERMISSION_TEMPLATES = {
  admin: ALLOWED_COMPANY_PERMISSIONS,
  staff: [
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
  ],
  viewer: ['dashboard.view', 'campaign.view', 'contact.view', 'group.view', 'delivery.view', 'appointment.view', 'inbox.view'],
};

const sanitizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return Array.from(new Set(permissions.filter((p) => ALLOWED_COMPANY_PERMISSIONS.includes(String(p)))));
};

const normalizeCompanyUserRole = (value) => {
  const raw = String(value || 'viewer').trim().toLowerCase();
  if (raw === 'company_admin' || raw === 'admin') {
    return { membershipRole: 'admin', platformRole: 'staff', uiRole: 'company_admin' };
  }
  if (raw === 'staff') {
    return { membershipRole: 'staff', platformRole: 'staff', uiRole: 'staff' };
  }
  return { membershipRole: 'viewer', platformRole: 'viewer', uiRole: 'viewer' };
};

const toSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const computeEffectiveMembershipPermissions = ({ role, membershipPermissions = [], companyPermissionKeys = [], companyLegacyPermissions = [] }) => {
  const roleTemplate = ROLE_PERMISSION_TEMPLATES[String(role || 'viewer').toLowerCase()] || ROLE_PERMISSION_TEMPLATES.viewer;
  const effectiveRole = membershipPermissions.length ? sanitizePermissions(membershipPermissions) : roleTemplate;
  const companyEnabled = new Set([...companyPermissionKeys, ...companyLegacyPermissions]);
  return effectiveRole.filter((p) => companyEnabled.has(p));
};

const canManageCompany = async (user, companyId) => {
  if (user?.role === 'admin') {
    const company = await Company.findByPk(companyId);
    if (!company) return { ok: false, status: 404, message: 'Company not found' };
    return { ok: true, membership: null, company };
  }

  const [company, membership, permissionRows] = await Promise.all([
    Company.findByPk(companyId),
    CompanyUser.findOne({ where: { companyId, userId: user.id } }),
    CompanyPermission.findAll({ where: { companyId, isEnabled: true } }),
  ]);

  if (!company) return { ok: false, status: 404, message: 'Company not found' };
  if (!membership) return { ok: false, status: 403, message: 'Not a member of this company' };
  if (String(membership.role || '').toLowerCase() === 'admin') return { ok: true, membership, company };

  const companyPermissionKeys = permissionRows.map((r) => r.permissionKey);
  const companyLegacyPermissions = Array.isArray(company.permissions) ? company.permissions : [];
  const effective = computeEffectiveMembershipPermissions({
    role: membership.role,
    membershipPermissions: Array.isArray(membership.permissions) ? membership.permissions : [],
    companyPermissionKeys,
    companyLegacyPermissions,
  });

  if (!effective.includes('company.manage')) {
    return { ok: false, status: 403, message: 'Permission denied: company.manage is required' };
  }

  return { ok: true, membership, company };
};

const getManageableCompanies = async (req, res) => {
  try {
    if (req.user?.role === 'admin') {
      const companies = await Company.findAll({ include: [{ association: 'memberships', attributes: ['id'] }], order: [['created_at', 'DESC']] });
      const data = companies.map((company) => ({ ...company.toJSON(), membersCount: company.memberships?.length || 0 }));
      return res.json({ data });
    }

    const memberships = await CompanyUser.findAll({
      where: { userId: req.user.id },
      include: [{ model: Company, as: 'company' }],
      order: [['created_at', 'DESC']],
    });

    const data = [];
    for (const m of memberships) {
      const company = m.company;
      if (!company) continue;
      if (String(m.role || '').toLowerCase() === 'admin') {
        data.push({ ...company.toJSON(), membersCount: 0 });
        continue;
      }
      const permissionRows = await CompanyPermission.findAll({ where: { companyId: company.id, isEnabled: true } });
      const effective = computeEffectiveMembershipPermissions({
        role: m.role,
        membershipPermissions: Array.isArray(m.permissions) ? m.permissions : [],
        companyPermissionKeys: permissionRows.map((r) => r.permissionKey),
        companyLegacyPermissions: Array.isArray(company.permissions) ? company.permissions : [],
      });
      if (!effective.includes('company.manage')) continue;
      data.push({ ...company.toJSON(), membersCount: 0 });
    }

    return res.json({ data });
  } catch (error) {
    console.error('Get manageable companies error:', error);
    return res.status(500).json({ message: 'Failed to fetch manageable companies' });
  }
};

const updateCompany = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const { name, slug, plan, status, contactEmail, contactPhone, timezone } = req.body || {};
    const company = access.company;

    const normalizedSlug = slug !== undefined ? toSlug(slug || name || company.slug) : company.slug;
    if (!normalizedSlug) return res.status(400).json({ message: 'Valid company slug is required' });

    if (name && name !== company.name) {
      const existsByName = await Company.findOne({ where: { name, id: { [Op.ne]: company.id } } });
      if (existsByName) return res.status(400).json({ message: 'Company name already in use' });
    }
    if (normalizedSlug !== company.slug) {
      const existsBySlug = await Company.findOne({ where: { slug: normalizedSlug, id: { [Op.ne]: company.id } } });
      if (existsBySlug) return res.status(400).json({ message: 'Company slug already in use' });
    }

    await company.update({
      name: name ?? company.name,
      slug: normalizedSlug,
      plan: plan ?? company.plan,
      status: status ?? company.status,
      contactEmail: contactEmail === '' ? null : contactEmail ?? company.contactEmail,
      contactPhone: contactPhone === '' ? null : contactPhone ?? company.contactPhone,
      timezone: timezone ?? company.timezone,
    });

    return res.json({ message: 'Company updated successfully', company });
  } catch (error) {
    console.error('Update company error:', error);
    return res.status(500).json({ message: 'Failed to update company' });
  }
};

const listCompanyUsers = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const memberships = await CompanyUser.findAll({
      where: { companyId },
      include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
      order: [['createdAt', 'DESC']],
    });

    const data = memberships.map((m) => ({
      id: m.id,
      companyId: m.companyId,
      userId: m.userId,
      role: m.role,
      permissions: Array.isArray(m.permissions) ? m.permissions : [],
      user: m.user,
      createdAt: m.createdAt,
    }));

    return res.json({ data });
  } catch (error) {
    console.error('List company users error:', error);
    return res.status(500).json({ message: 'Failed to list company users' });
  }
};

const createCompanyUserManaged = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    if (!companyId) return res.status(400).json({ message: 'Invalid company id' });

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const { name, email, password, phoneNumber, role = 'viewer', permissions = [] } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const normalizedRole = normalizeCompanyUserRole(role);

    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber || null,
      role: normalizedRole.platformRole,
      accountScope: 'tenant',
    });

    const membership = await CompanyUser.create({
      companyId,
      userId: user.id,
      role: normalizedRole.membershipRole,
      permissions: sanitizePermissions(permissions),
    });

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.status(201).json({
      message: 'Company user created successfully',
      user: safeUser,
      membership,
      companyRole: normalizedRole.uiRole,
    });
  } catch (error) {
    console.error('Create managed company user error:', error);
    return res.status(500).json({ message: 'Failed to create company user' });
  }
};

const updateCompanyUserManaged = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    const membershipId = Number(req.params.membershipId);
    if (!companyId || !membershipId) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const access = await canManageCompany(req.user, companyId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const membership = await CompanyUser.findOne({
      where: { id: membershipId, companyId },
      include: [{ model: User, as: 'user' }],
    });
    if (!membership?.user) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    const user = membership.user;
    const { name, email, phoneNumber, password, role, permissions } = req.body || {};

    if (email !== undefined) {
      const nextEmail = String(email).trim();
      if (!nextEmail) return res.status(400).json({ message: 'Email required' });
      if (nextEmail.toLowerCase() !== String(user.email).toLowerCase()) {
        const exists = await User.findOne({ where: { email: nextEmail, id: { [Op.ne]: user.id } } });
        if (exists) return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (role !== undefined) {
      const normalized = normalizeCompanyUserRole(role);
      membership.role = normalized.membershipRole;
      user.role = normalized.platformRole;
    }

    if (permissions !== undefined) {
      membership.permissions = sanitizePermissions(permissions);
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = String(email).trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber || null;
    if (password && String(password).length > 0) {
      user.password = password;
    }

    await membership.save();
    await user.save();
    await user.reload({ attributes: { exclude: ['password'] } });

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.json({
      user: safeUser,
      membership: {
        id: membership.id,
        companyId: membership.companyId,
        userId: membership.userId,
        role: membership.role,
        permissions: Array.isArray(membership.permissions) ? membership.permissions : [],
      },
    });
  } catch (error) {
    console.error('Update company user error:', error);
    return res.status(500).json({ message: 'Failed to update user' });
  }
};

module.exports = {
  getManageableCompanies,
  updateCompany,
  listCompanyUsers,
  createCompanyUserManaged,
  updateCompanyUserManaged,
  canManageCompany,
};
