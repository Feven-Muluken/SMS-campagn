export const canAccess = (user, permissionKey) => {
	if (!permissionKey) return true;
	if (!user) return false;

	const role = String(user.role || '').toLowerCase();
	if (role === 'admin') return true;

	const companyPerms = Array.isArray(user.companyPermissions) ? user.companyPermissions : [];
	return companyPerms.includes(permissionKey);
};

