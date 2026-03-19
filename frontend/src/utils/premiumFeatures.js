export const premiumFeatures = [
  {
    slug: 'sender-ids',
    title: 'Premium Sender IDs',
    description: 'Show your business name as sender to improve trust and open rates.',
    path: '/send-sms',
    cta: 'Configure sender ID',
    available: true,
  },
  {
    slug: 'appointment-system',
    title: 'SMS Appointment System',
    description: 'Send automatic confirmations, reminders, cancellations, and follow-ups.',
    path: '/appointments',
    cta: 'Manage appointments',
    available: true,
  },
  {
    slug: 'ticketing-support',
    title: 'SMS Ticketing & Customer Support',
    description: 'Handle customer questions and replies through organized SMS conversations.',
    path: '/premium/ticketing-support',
    cta: 'Open support inbox',
    available: true,
  },
  {
    slug: 'geo-marketing',
    title: 'Geo-SMS Marketing',
    description: 'Reach customers near specific locations with time-sensitive offers.',
    path: '/premium/geo-marketing',
    cta: 'Run geo campaign',
    available: true,
  },
  {
    slug: 'two-way-chat',
    title: 'Two-Way SMS Chat',
    description: 'Allow customers to reply and have live conversations without internet.',
    path: '/premium/two-way-chat',
    cta: 'Open chat inbox',
    available: true,
  },
  {
    slug: 'contact-segment',
    title: 'Contact Segment SMS',
    description: 'Target messages by tags, interests, and behavior for better conversion.',
    path: '/contacts',
    cta: 'Manage segments',
    available: true,
  },
  {
    slug: 'billing-alerts',
    title: 'SMS Invoices & Billing Alerts',
    description: 'Automatically send due reminders, receipts, and payment confirmations.',
    path: '/premium/billing-alerts',
    cta: 'Send billing alerts',
    available: true,
  },
  {
    slug: 'smart-scheduler-ai',
    title: 'Smart Scheduler AI',
    description: 'Choose best send times based on customer engagement patterns.',
    path: '/campaign/new',
    cta: 'Schedule campaign',
    available: true,
  },
  {
    slug: 'delivery-reports',
    title: 'Delivery Reports & Analytics',
    description: 'Track delivered, failed, response, and conversion metrics.',
    path: '/delivery-status',
    cta: 'View reports',
    available: true,
  },
  {
    slug: 'templates-library',
    title: 'SMS Templates Library',
    description: 'Use ready-made templates for marketing, billing, and support.',
    path: '/campaign/new?template=true',
    cta: 'Use templates',
    available: true,
  },
];

export const premiumFeatureBySlug = premiumFeatures.reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});
