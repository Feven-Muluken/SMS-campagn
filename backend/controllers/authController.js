const jwt = require('jsonwebtoken');
const { fn, col, where } = require('sequelize');
const { User, CompanyUser, CompanyPermission, Company } = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');

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

const ROLE_TEMPLATE = {
  admin: COMPANY_PERMISSION_KEYS,
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

const toSafeUser = (user) => {
  const plain = user?.toJSON ? user.toJSON() : user;
  if (plain && plain.password) delete plain.password;
  return plain;
};

const buildCompanyContext = async ({ userId, preferredCompanyId = null }) => {
  const memberships = await CompanyUser.findAll({
    where: { userId },
    include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'slug', 'permissions'] }],
    order: [['created_at', 'ASC']],
  });

  if (!memberships.length) {
    return {
      activeCompanyId: null,
      companyRole: null,
      companyPermissions: [],
      companies: [],
    };
  }

  const selected =
    memberships.find((m) => Number(m.companyId) === Number(preferredCompanyId)) || memberships[0];

  const permissionRows = await CompanyPermission.findAll({
    where: { companyId: selected.companyId, isEnabled: true },
  });

  const membershipPerms = Array.isArray(selected.permissions) ? selected.permissions : [];
  const rolePerms = ROLE_TEMPLATE[String(selected.role || 'viewer').toLowerCase()] || ROLE_TEMPLATE.viewer;
  const enabledPerms = permissionRows.map((r) => r.permissionKey);
  const fallbackEnabled = Array.isArray(selected.company?.permissions) ? selected.company.permissions : [];
  const enabledSet = new Set([...enabledPerms, ...fallbackEnabled]);
  const candidatePerms = membershipPerms.length ? membershipPerms : rolePerms;
  const companyPermissions = candidatePerms.filter((p) => enabledSet.has(p));

  return {
    activeCompanyId: selected.companyId,
    companyRole: selected.role,
    companyPermissions,
    companies: memberships.map((m) => ({
      companyId: m.companyId,
      role: m.role,
      permissions: Array.isArray(m.permissions) ? m.permissions : [],
      name: m.company?.name || null,
      slug: m.company?.slug || null,
    })),
  };
};

const signAuthToken = ({ user, rememberMe = false, companyContext }) => {
  const expiresIn = rememberMe ? '30d' : '7d';
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    activeCompanyId: companyContext?.activeCompanyId || null,
    companyRole: companyContext?.companyRole || null,
    companyPermissions: companyContext?.companyPermissions || [],
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phoneNumber,
      accountScope: 'platform',
    });

    const companyContext = await buildCompanyContext({ userId: user.id });
    const token = signAuthToken({ user, rememberMe: false, companyContext });

    res.status(201).json({
      message: 'User created successfully',
      user: toSafeUser(user),
      token,
      activeCompanyId: companyContext.activeCompanyId,
      companyRole: companyContext.companyRole,
      companyPermissions: companyContext.companyPermissions,
      companies: companyContext.companies,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body || {};
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const companyContext = await buildCompanyContext({ userId: user.id });
    const token = signAuthToken({ user, rememberMe, companyContext });

    res.json({
      token,
      user: toSafeUser(user),
      activeCompanyId: companyContext.activeCompanyId,
      companyRole: companyContext.companyRole,
      companyPermissions: companyContext.companyPermissions,
      companies: companyContext.companies,
    });
  } catch (error) {
    next(error);
  }
};

const switchCompany = async (req, res, next) => {
  try {
    const { companyId, rememberMe = false } = req.body || {};
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const companyContext = await buildCompanyContext({ userId: user.id, preferredCompanyId: companyId });
    if (!companyContext.activeCompanyId || Number(companyContext.activeCompanyId) !== Number(companyId)) {
      return res.status(403).json({ message: 'You are not a member of this company' });
    }

    const token = signAuthToken({ user, rememberMe, companyContext });

    return res.json({
      token,
      activeCompanyId: companyContext.activeCompanyId,
      companyRole: companyContext.companyRole,
      companyPermissions: companyContext.companyPermissions,
      companies: companyContext.companies,
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const raw = req.body?.email;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const genericMessage =
      'If an account exists for that email, we sent password reset instructions. Check your inbox and spam folder.';

    const user = await User.findOne({
      where: where(fn('LOWER', col('email')), email),
    });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      purpose: 'password-reset',
    };

    const resetToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    const response = {
      message: emailResult.sent
        ? 'Check your email for a reset link. It expires in 15 minutes.'
        : 'Reset link could not be emailed. Ask your administrator to configure SMTP, or use a development build to see the link below.',
      emailSent: emailResult.sent,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetUrl = resetUrl;
      response.resetToken = resetToken;
    }

    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, switchCompany, forgotPassword, resetPassword };
