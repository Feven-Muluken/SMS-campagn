export const COMPANY_PERMISSION_KEYS = [
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

export const companyRoleTemplates = {
  company_admin: COMPANY_PERMISSION_KEYS,
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

export const labelPermission = (key) =>
  String(key)
    .split('.')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' · ');
