const { Company, CompanyUser, CompanyPermission } = require('../models');

const ALL_COMPANY_PERMISSIONS = [
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
	admin: ALL_COMPANY_PERMISSIONS,
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

const parseCompanyId = (value) => {
	if (value === undefined || value === null || value === '') return null;
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : null;
};

const sanitizePermissionList = (permissions = []) => {
	if (!Array.isArray(permissions)) return [];
	return Array.from(new Set(permissions.filter((p) => ALL_COMPANY_PERMISSIONS.includes(String(p)))));
};

const getPermissionSet = ({ role = 'viewer', membershipPermissions = [], companyPermissions = [], companyLegacyPermissions = [] }) => {
	const roleTemplate = ROLE_PERMISSION_TEMPLATES[String(role || 'viewer').toLowerCase()] || ROLE_PERMISSION_TEMPLATES.viewer;
	const effectiveRole = membershipPermissions.length ? sanitizePermissionList(membershipPermissions) : roleTemplate;
	const enabledSet = new Set([...companyPermissions, ...companyLegacyPermissions]);
	return effectiveRole.filter((p) => enabledSet.has(p));
};

const requireCompanyMembership = async (req, res, next) => {
	try {
		const headerCompanyId = parseCompanyId(req.headers['x-company-id']);
		const tokenCompanyId = parseCompanyId(req.auth?.activeCompanyId);
		const bodyCompanyId = parseCompanyId(req.body?.companyId);
		const queryCompanyId = parseCompanyId(req.query?.companyId);
		const paramCompanyId = parseCompanyId(req.params?.companyId);

		let activeCompanyId = headerCompanyId || tokenCompanyId || bodyCompanyId || queryCompanyId || paramCompanyId;

		if (req.user?.role === 'admin') {
			const company = activeCompanyId ? await Company.findByPk(activeCompanyId) : null;
			req.companyContext = {
				companyId: activeCompanyId || null,
				company,
				membership: null,
				role: 'admin',
				permissions: ALL_COMPANY_PERMISSIONS,
			};
			return next();
		}

		if (!activeCompanyId) {
			const fallbackMembership = await CompanyUser.findOne({ where: { userId: req.user.id }, order: [['created_at', 'ASC']] });
			activeCompanyId = fallbackMembership?.companyId || null;
		}

		if (!activeCompanyId) {
			return res.status(400).json({
				message: 'Active company context is required. Provide X-Company-Id header or switch company.',
			});
		}

		const [company, membership, permissionRows] = await Promise.all([
			Company.findByPk(activeCompanyId),
			CompanyUser.findOne({ where: { companyId: activeCompanyId, userId: req.user.id } }),
			CompanyPermission.findAll({ where: { companyId: activeCompanyId, isEnabled: true } }),
		]);

		if (!company) return res.status(404).json({ message: 'Company not found for active context' });
		if (!membership) return res.status(403).json({ message: 'Permission denied: user is not a member of this company' });

		const companyPermissions = permissionRows.map((row) => row.permissionKey);
		const membershipPermissions = Array.isArray(membership.permissions) ? membership.permissions : [];
		const companyLegacyPermissions = Array.isArray(company.permissions) ? company.permissions : [];

		req.companyContext = {
			companyId: activeCompanyId,
			company,
			membership,
			role: membership.role,
			permissions: getPermissionSet({
				role: membership.role,
				membershipPermissions,
				companyPermissions,
				companyLegacyPermissions,
			}),
		};

		next();
	} catch (error) {
		console.error('requireCompanyMembership error:', error);
		res.status(500).json({ message: 'Failed to resolve company membership context' });
	}
};

const requireCompanyPermission = (requiredPermission) => (req, res, next) => {
	if (req.user?.role === 'admin') return next();

	if (!req.companyContext) {
		return res.status(500).json({ message: 'Company context missing in permission middleware' });
	}

	const permissions = req.companyContext.permissions || [];
	if (!permissions.includes(requiredPermission)) {
		return res.status(403).json({
			message: 'Permission denied for this company action',
			requiredPermission,
			activeCompanyId: req.companyContext.companyId,
		});
	}
	next();
};

module.exports = {
	requireCompanyMembership,
	requireCompanyPermission,
};
