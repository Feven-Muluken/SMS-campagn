const rolePermissionMap = {
  admin: [
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
  staff: [
    'dashboard.view',
    'campaign.view',
    'campaign.send',
    'contact.view',
    'contact.manage',
    'group.view',
    'group.manage',
    'sms.send',
    'delivery.view',
    'appointment.view',
    'appointment.manage',
    'inbox.view',
    'inbox.reply',
    'geo.send',
    'billing.send',
  ],
  viewer: [
    'dashboard.view',
    'campaign.view',
    'contact.view',
    'group.view',
    'delivery.view',
    'appointment.view',
    'inbox.view',
  ],
};

export const getEffectivePermissions = (user) => {
  if (!user?.role) return [];
  const role = String(user.role).toLowerCase();
  const rolePermissions = rolePermissionMap[role] || [];
  const explicit = Array.isArray(user.permissions) ? user.permissions : [];
  return Array.from(new Set([...rolePermissions, ...explicit]));
};

export const canAccess = (user, requiredPermission) => {
  if (!requiredPermission) return true;
  const permissions = getEffectivePermissions(user);
  return permissions.includes(requiredPermission);
};
