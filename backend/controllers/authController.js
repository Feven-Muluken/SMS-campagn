const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { fn, col, where } = require('sequelize');
const { User, CompanyUser, CompanyPermission, Company } = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');
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
  'dashboard.view', 'campaign.view', 'campaign.create', 'campaign.schedule',
  'contact.view', 'contact.create', 'group.view', 'group.create',
  'inbox.view', 'inbox.reply',
];

const ROLE_TEMPLATE = {
  admin: COMPANY_PERMISSION_KEYS,
  staff: [
    'dashboard.view',
    'campaign.view',
    'campaign.manage',
    'campaign.send',
    'group.send',
    'contact.send',
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
    'inbox.status',
    'geo.send',
    'billing.send',
    'company.manage',
  ],
  viewer: ['dashboard.view', 'campaign.view', 'contact.view', 'group.view', 'delivery.view', 'appointment.view', 'inbox.view'],
};

const toSafeUser = (user) => {
  const plain = user?.toJSON ? user.toJSON() : user;
  if (plain && plain.password) delete plain.password;
  if (plain && plain.passwordResetNonce) delete plain.passwordResetNonce;
  return plain;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const buildCompanyContext = async ({ userId, preferredCompanyId = null }) => {
  const memberships = await CompanyUser.findAll({
    where: { userId },
    include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'slug', 'plan', 'status', 'permissions'] }],
    order: [['created_at', 'ASC']],
  });

  if (!memberships.length) {
    return {
      activeCompanyId: null,
      companyRole: null,
      companyPermissions: null,
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
  const enabledSet = new Set([...REQUIRED_COMPANY_PERMISSIONS, ...enabledPerms, ...fallbackEnabled]);
  const candidatePerms = membershipPerms;
  const companyPermissions = normalizePermissionDependencies(
    candidatePerms.filter((p) => enabledSet.has(p)),
  );

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
      plan: m.company?.plan || null,
      status: m.company?.status || null,
    })),
  };
};

const signAuthTokens = ({ user, companyContext }) => {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    activeCompanyId: companyContext?.activeCompanyId || null,
    companyRole: companyContext?.companyRole || null,
    companyPermissions: companyContext?.companyPermissions || [],
    tokenType: 'access',
  };
  return {
    token: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' }),
    refreshToken: jwt.sign({
      id: user.id,
      activeCompanyId: companyContext?.activeCompanyId || null,
      tokenType: 'refresh',
    }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' }),
  };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phoneNumber, permissions = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (String(password).length < 12) {
      return res.status(400).json({ message: 'Password must be at least 12 characters long' });
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
      permissions: Array.isArray(permissions)
        ? permissions.filter((permission) => COMPANY_PERMISSION_KEYS.includes(String(permission)))
        : [],
    });

    const companyContext = await buildCompanyContext({ userId: user.id });
    const { token, refreshToken } = signAuthTokens({ user, companyContext });

    res.status(201).json({
      message: 'User created successfully',
      user: toSafeUser(user),
      token,
      refreshToken,
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
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
        code: 'VALIDATION_ERROR',
        errors: {
          email: !email ? 'Email is required.' : null,
          password: !password ? 'Password is required.' : null,
        },
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
        code: 'INVALID_EMAIL_FORMAT',
        errors: {
          email: 'Invalid email format.',
        },
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const companyContext = await buildCompanyContext({ userId: user.id });
    const { token, refreshToken } = signAuthTokens({ user, companyContext });

    res.json({
      token,
      refreshToken,
      user: toSafeUser(user),
      activeCompanyId: companyContext.activeCompanyId,
      companyRole: companyContext.companyRole,
      companyPermissions: companyContext.companyPermissions,
      companies: companyContext.companies,
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({
      message: 'Login failed due to a server error. Please try again.',
      code: 'LOGIN_SERVER_ERROR',
    });
  }
};

const switchCompany = async (req, res, next) => {
  try {
    const { companyId } = req.body || {};
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const companyContext = await buildCompanyContext({ userId: user.id, preferredCompanyId: companyId });
    if (!companyContext.activeCompanyId || Number(companyContext.activeCompanyId) !== Number(companyId)) {
      return res.status(403).json({ message: 'You are not a member of this company' });
    }

    const { token, refreshToken } = signAuthTokens({ user, companyContext });

    return res.json({
      token,
      refreshToken,
      activeCompanyId: companyContext.activeCompanyId,
      companyRole: companyContext.companyRole,
      companyPermissions: companyContext.companyPermissions,
      companies: companyContext.companies,
    });
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '');
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
    );
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const companyContext = await buildCompanyContext({
      userId: user.id,
      preferredCompanyId: decoded.activeCompanyId,
    });
    return res.json(signAuthTokens({ user, companyContext }));
  } catch (_) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
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

    const challengeNonce = crypto.randomBytes(24).toString('hex');
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const otpHash = crypto
      .createHash('sha256')
      .update(`${challengeNonce}:${otp}`)
      .digest('hex');
    await user.update({ passwordResetNonce: otpHash });
    const challengePayload = {
      id: user.id,
      email: user.email,
      purpose: 'password-reset-otp',
      nonce: challengeNonce,
    };

    const verificationToken = jwt.sign(challengePayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      otp,
    });

    const response = {
      message: emailResult.sent
        ? 'Check your email for a six-digit verification code. It expires in 15 minutes.'
        : 'The verification code could not be emailed. Ask your administrator to check SMTP.',
      emailSent: emailResult.sent,
      verificationToken,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.otp = otp;
    }

    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const verificationToken = String(req.body?.verificationToken || '');
    const otp = String(req.body?.otp || '').trim();
    if (!verificationToken || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'A valid six-digit verification code is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(400).json({ message: 'The verification code has expired. Request a new code.' });
    }
    if (decoded.purpose !== 'password-reset-otp' || !decoded.id || !decoded.nonce) {
      return res.status(400).json({ message: 'Invalid verification request' });
    }

    const user = await User.findByPk(decoded.id);
    const suppliedHash = crypto
      .createHash('sha256')
      .update(`${decoded.nonce}:${otp}`)
      .digest('hex');
    const storedHash = String(user?.passwordResetNonce || '');
    const matches = storedHash.length === suppliedHash.length &&
      crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(suppliedHash));
    if (!user || !matches) {
      return res.status(400).json({ message: 'Incorrect verification code' });
    }

    const resetNonce = crypto.randomBytes(24).toString('hex');
    await user.update({ passwordResetNonce: resetNonce });
    const resetToken = jwt.sign({
      id: user.id,
      email: user.email,
      purpose: 'password-reset',
      nonce: resetNonce,
    }, process.env.JWT_SECRET, { expiresIn: '15m' });

    return res.json({ message: 'Code verified', resetToken });
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
    if (!decoded.nonce || decoded.nonce !== user.passwordResetNonce) {
      return res.status(400).json({ message: 'Invalid or already used reset token' });
    }

    user.password = newPassword;
    user.passwordResetNonce = null;
    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, refresh, switchCompany, forgotPassword, verifyPasswordResetOtp, resetPassword };
