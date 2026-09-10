const { Op } = require('sequelize');
const { User, Campaign, Message, Contact, Group, Company, CompanyUser, CompanyPermission } = require('../models');
const { normalizePermissionDependencies } = require('../utils/companyPermissionDependencies');

const ALLOWED_COMPANY_PERMISSIONS = [
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

const wherePlatformUser = {
  [Op.or]: [{ accountScope: 'platform' }, { accountScope: null }],
};

const sanitizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return normalizePermissionDependencies(permissions.filter((p) =>
    ALLOWED_COMPANY_PERMISSIONS.includes(String(p))));
};

const toSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

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

const admin = async (req, res) => {
  res.send('Admin page');
};

const canViewPlatformDashboard = (user) =>
  user?.role === 'admin' ||
  (user?.accountScope === 'platform' &&
    Array.isArray(user.permissions) &&
    user.permissions.includes('dashboard.view'));

const hasPlatformPermission = (user, permission) =>
  user?.role === 'admin' ||
  (user?.accountScope === 'platform' &&
    Array.isArray(user.permissions) &&
    user.permissions.includes(permission));

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const sortBy = ['name', 'email', 'role', 'created_at', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const ilike = Op.iLike || Op.like;
    const searchWhere = search
      ? {
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
            { email: { [ilike]: `%${search}%` } },
            { role: { [ilike]: `%${search}%` } },
          ],
        }
      : {};

    const where = searchWhere;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { association: 'creator', attributes: ['name', 'email'], required: false },
        {
          model: CompanyUser,
          as: 'companyMemberships',
          required: false,
          include: [{ model: Company, as: 'company', required: false }],
        },
      ],
      distinct: true,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [[sortBy, sortDir]],
    });

    const data = rows.map((row) => {
      const user = row.toJSON();
      const membership = user.companyMemberships?.[0];
      delete user.companyMemberships;
      if (!membership) return user;

      return {
        ...user,
        role: membership.role === 'admin' ? 'company_admin' : membership.role,
        company: membership.company || null,
        companyPermissions: Array.isArray(membership.permissions)
          ? membership.permissions
          : [],
        companyJoinedAt: membership.createdAt || null,
        membershipId: membership.id,
      };
    });

    res.json({
      data,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Fetch users error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, phoneNumber, password, permissions } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.accountScope === 'tenant') {
      return res.status(400).json({
        message: 'This account is a company user. Manage it under Company access for that organization.',
      });
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (exists) return res.status(400).json({ message: 'Email already taken' });
    }

    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      role: role ?? user.role,
      phoneNumber: phoneNumber ?? user.phoneNumber,
      password: password ?? user.password,
      permissions: permissions === undefined
        ? user.permissions
        : sanitizePermissions(permissions),
    });

    const safeUser = user.toJSON();
    delete safeUser.password;
    res.json({ user: safeUser, message: 'User updated' });
  } catch (error) {
    console.error('Update user error: ', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const deleteUser = async (req, res) => {
  try {
    const existing = await User.findByPk(req.params.id);
    if (!existing) return res.status(404).json({ message: 'User does not exist' });
    if (existing.accountScope === 'tenant') {
      return res.status(400).json({
        message: 'Remove company users from Company access, not from User Management.',
      });
    }
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'User does not exist' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    if (!canViewPlatformDashboard(req.user)) {
      return res.status(403).json({ message: 'Dashboard permission is required' });
    }
    const [userCount, contactCount, campaignCount, messageCount, groupCount] = await Promise.all([
      hasPlatformPermission(req.user, 'user.manage') ? User.count({ where: wherePlatformUser }) : 0,
      hasPlatformPermission(req.user, 'contact.view') ? Contact.count() : 0,
      hasPlatformPermission(req.user, 'campaign.view') ? Campaign.count() : 0,
      hasPlatformPermission(req.user, 'delivery.view') ? Message.count() : 0,
      hasPlatformPermission(req.user, 'group.view') ? Group.count() : 0,
    ]);
    res.json({ userCount, contactCount, campaignCount, messageCount, groupCount });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    if (!canViewPlatformDashboard(req.user)) {
      return res.status(403).json({ message: 'Dashboard permission is required' });
    }
    const recentCampaigns = hasPlatformPermission(req.user, 'campaign.view') ? await Campaign.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'creator', attributes: ['id', 'name', 'email'] }],
    }) : [];

    const recentMessages = hasPlatformPermission(req.user, 'delivery.view') ? await Message.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [
        {
          association: 'campaign',
          required: false,
          attributes: ['id', 'name', 'groupId'],
          include: [{ model: Group, as: 'group', required: false, attributes: ['id', 'name'] }],
        },
      ],
    }) : [];

    res.json({ recentCampaigns, recentMessages });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        { association: 'memberships', attributes: ['id'] },
        { association: 'creator', attributes: ['name', 'email'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    const data = companies.map((company) => ({
      ...company.toJSON(),
      membersCount: company.memberships?.length || 0,
    }));

    return res.json({ data });
  } catch (error) {
    console.error('Fetch companies error:', error);
    return res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

const createCompany = async (req, res) => {
  try {
    const {
      name,
      slug,
      plan = 'starter',
      status = 'trial',
      contactEmail,
      contactPhone,
      timezone = 'Africa/Addis_Ababa',
      permissions = [],
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const normalizedSlug = toSlug(slug || name);
    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid company slug is required' });
    }

    const existing = await Company.findOne({
      where: {
        [Op.or]: [{ name }, { slug: normalizedSlug }],
      },
    });
    if (existing) {
      return res.status(400).json({ message: 'Company with this name or slug already exists' });
    }

    const sanitized = sanitizePermissions(permissions);
    const enabledSet = new Set(sanitized);

    const company = await Company.create({
      name,
      slug: normalizedSlug,
      plan,
      status,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      timezone,
      createdById: req.user?.id || null,
      permissions: sanitized,
    });

    await CompanyPermission.bulkCreate(
      ALLOWED_COMPANY_PERMISSIONS
        .filter((permissionKey) => !REQUIRED_COMPANY_PERMISSIONS.includes(permissionKey))
        .map((permissionKey) => ({
        companyId: company.id,
        permissionKey,
        isEnabled: enabledSet.has(permissionKey),
        config: {},
        grantedById: req.user?.id || null,
        }))
    );

    return res.status(201).json({ message: 'Company created successfully', company });
  } catch (error) {
    console.error('Create company error:', error);
    return res.status(500).json({ message: 'Failed to create company' });
  }
};

const updateCompanyPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body || {};

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.permissions = sanitizePermissions(permissions);
    await company.save();

    return res.json({ message: 'Company permissions updated', company });
  } catch (error) {
    console.error('Update company permissions error:', error);
    return res.status(500).json({ message: 'Failed to update permissions' });
  }
};

const createCompanyUser = async (req, res) => {
  try {
    const { id: companyId } = req.params;
    const { name, email, password, phoneNumber, role = 'viewer', permissions = [] } = req.body || {};
    const normalizedRole = normalizeCompanyUserRole(role);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber || null,
      role: normalizedRole.platformRole,
      accountScope: 'tenant',
      createdById: req.user?.id || null,
    });

    const membership = await CompanyUser.create({
      companyId: company.id,
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
    console.error('Create company user error:', error);
    return res.status(500).json({ message: 'Failed to create company user' });
  }
};

module.exports = {
  admin,
  getAllUsers,
  updateUser,
  deleteUser,
  getDashboardStats,
  getRecentActivity,
  getCompanies,
  createCompany,
  updateCompanyPermissions,
  createCompanyUser,
};
