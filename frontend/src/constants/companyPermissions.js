export const COMPANY_PERMISSION_KEYS = [
  'dashboard.view',
  'campaign.view',
  'campaign.create',
  'campaign.manage',
  'campaign.schedule',
  'campaign.send',
  'contact.view',
  'contact.create',
  'contact.manage',
  'contact.send',
  'group.view',
  'group.create',
  'group.manage',
  'group.send',
  'user.manage',
  'sms.send',
  'delivery.view',
  'appointment.view',
  'appointment.manage',
  'inbox.assign',
  'inbox.status',
  'geo.send',
  'billing.send',
  'company.manage',
];

// Inbox chat is available to every company member and is intentionally not a
// configurable permission. Child actions only appear after their parent view
// permission is selected.
export const PERMISSION_DEPENDENCIES = {
  'campaign.create': ['campaign.view'],
  'campaign.manage': ['campaign.view'],
  'campaign.schedule': ['campaign.view'],
  'campaign.send': ['campaign.view'],
  'contact.create': ['contact.view'],
  'contact.manage': ['contact.view'],
  'contact.send': ['contact.view'],
  'group.create': ['group.view', 'contact.view'],
  'group.manage': ['group.view'],
  'group.send': ['group.view'],
  'appointment.manage': ['appointment.view'],
};

export const PERMISSION_ANY_DEPENDENCIES = {
  'sms.send': ['campaign.send', 'contact.send', 'group.send'],
};

export const ALWAYS_ENABLED_COMPANY_PERMISSIONS = new Set([
  'dashboard.view',
  'campaign.view',
  'campaign.create',
  'campaign.schedule',
  'contact.view',
  'contact.create',
  'group.view',
  'group.create',
]);

export const COMPANY_CONFIGURABLE_PERMISSION_KEYS = COMPANY_PERMISSION_KEYS.filter(
  (key) => !ALWAYS_ENABLED_COMPANY_PERMISSIONS.has(key),
);

export const permissionIsVisible = (key, selected = [], alwaysEnabled = []) => {
  const enabled = new Set([...selected, ...alwaysEnabled]);
  const allSatisfied = (PERMISSION_DEPENDENCIES[key] || [])
    .every((required) => enabled.has(required));
  const anyRequired = PERMISSION_ANY_DEPENDENCIES[key] || [];
  return allSatisfied && (!anyRequired.length || anyRequired.some((required) => enabled.has(required)));
};

export const normalizePermissionDependencies = (permissions = [], alwaysEnabled = []) => {
  let result = Array.from(new Set(permissions));
  let changed = true;
  while (changed) {
    const enabled = new Set([...result, ...alwaysEnabled]);
    const next = result.filter((key) => {
      const allSatisfied = (PERMISSION_DEPENDENCIES[key] || [])
        .every((required) => enabled.has(required));
      const anyRequired = PERMISSION_ANY_DEPENDENCIES[key] || [];
      return allSatisfied && (!anyRequired.length || anyRequired.some((required) => enabled.has(required)));
    });
    changed = next.length !== result.length;
    result = next;
  }
  return result;
};

export const togglePermissionWithDependencies = (permissions, key, alwaysEnabled = []) => {
  const selected = new Set(permissions);
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  return normalizePermissionDependencies([...selected], alwaysEnabled);
};

export const companyRoleTemplates = {
  company_admin: COMPANY_PERMISSION_KEYS,
  staff: [
    'dashboard.view',
    'campaign.view',
    'campaign.send',
    'contact.view',
    'contact.manage',
    'contact.send',
    'group.view',
    'group.manage',
    'group.send',
    'sms.send',
    'delivery.view',
    'appointment.view',
    'appointment.manage',
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
  ],
};

export const labelPermission = (key) =>
  String(key)
    .split('.')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' · ');
