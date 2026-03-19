const { Op } = require('sequelize');
const { User, Campaign, Message, Contact, Group, Company, CompanyUser, sequelize } = require('../models');

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

const sanitizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return Array.from(new Set(permissions.filter((p) => ALLOWED_COMPANY_PERMISSIONS.includes(p))));
};

const toSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const admin = async (req, res) => {
  res.send('Admin page');
};

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
    const where = search
      ? {
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
            { email: { [ilike]: `%${search}%` } },
            { role: { [ilike]: `%${search}%` } },
          ],
        }
      : {};

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [[sortBy, sortDir]],
    });

    res.json({
      data: rows,
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
    const { name, email, role, phoneNumber, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

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
    const [userCount, contactCount, campaignCount, messageCount, groupCount] = await Promise.all([
      User.count(),
      Contact.count(),
      Campaign.count(),
      Message.count(),
      Group.count()
    ]);
    res.json({ userCount, contactCount, campaignCount, messageCount, groupCount });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const recentCampaigns = await Campaign.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'creator', attributes: ['id', 'name', 'email'] }],
    });

    const recentMessages = await Message.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'campaign', attributes: ['id', 'name'] }],
    });

    const contactIds = recentMessages.filter((m) => m.recipientType === 'Contact').map((m) => m.recipientId);
    const userIds = recentMessages.filter((m) => m.recipientType === 'User').map((m) => m.recipientId);

    const [contacts, users] = await Promise.all([
      contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
      userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
    ]);

    const contactsMap = Object.fromEntries(contacts.map((c) => [c.id, c]));
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const formattedMessages = recentMessages.map((msg) => {
      const recipient = msg.recipientType === 'Contact' ? contactsMap[msg.recipientId] : usersMap[msg.recipientId];
      return {
        ...msg.toJSON(),
        recipient: recipient ? { id: recipient.id, name: recipient.name || recipient.email, phoneNumber: recipient.phoneNumber || null } : null,
      };
    });

    res.json({ recentCampaigns, recentMessages: formattedMessages });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [{ association: 'memberships', attributes: ['id'] }],
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

    const company = await Company.create({
      name,
      slug: normalizedSlug,
      plan,
      status,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      timezone,
      permissions: sanitizePermissions(permissions),
    });

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
  const transaction = await sequelize.transaction();
  try {
    const { id: companyId } = req.params;
    const { name, email, password, phoneNumber, role = 'viewer', permissions = [] } = req.body || {};

    if (!name || !email || !password) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const company = await Company.findByPk(companyId, { transaction });
    if (!company) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Company not found' });
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const user = await User.create(
      {
        name,
        email,
        password,
        phoneNumber: phoneNumber || null,
        role,
      },
      { transaction }
    );

    const membership = await CompanyUser.create(
      {
        companyId: company.id,
        userId: user.id,
        role,
        permissions: sanitizePermissions(permissions),
      },
      { transaction }
    );

    await transaction.commit();

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.status(201).json({
      message: 'Company user created successfully',
      user: safeUser,
      membership,
    });
  } catch (error) {
    await transaction.rollback();
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