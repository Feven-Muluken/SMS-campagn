const PERMISSION_DEPENDENCIES = Object.freeze({
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
});

const PERMISSION_ANY_DEPENDENCIES = Object.freeze({
  'sms.send': ['campaign.send', 'contact.send', 'group.send'],
});

const normalizePermissionDependencies = (permissions = [], alwaysEnabled = []) => {
  let normalized = Array.from(new Set(permissions.map(String)));
  let changed = true;
  while (changed) {
    const enabled = new Set([...normalized, ...alwaysEnabled]);
    const next = normalized.filter((permission) => {
      const allSatisfied = (PERMISSION_DEPENDENCIES[permission] || [])
        .every((required) => enabled.has(required));
      const anyRequired = PERMISSION_ANY_DEPENDENCIES[permission] || [];
      return allSatisfied && (!anyRequired.length || anyRequired.some((required) => enabled.has(required)));
    });
    changed = next.length !== normalized.length;
    normalized = next;
  }
  return normalized;
};

module.exports = {
  PERMISSION_DEPENDENCIES,
  PERMISSION_ANY_DEPENDENCIES,
  normalizePermissionDependencies,
};
