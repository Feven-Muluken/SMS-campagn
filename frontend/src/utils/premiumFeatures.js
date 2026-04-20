export const premiumFeatures = [
  {
    slug: 'sender-ids',
    title: 'Premium Sender IDs',
    description: 'Show your business name as sender when approved by Africa\'s Talking.',
    path: '/send-sms',
    cta: 'Configure sender ID',
    available: true,
  },
  {
    slug: 'appointment-system',
    title: 'SMS Appointment System',
    description: 'Confirmation on booking, scheduled reminders, cancellation SMS, and follow-ups after completion.',
    path: '/appointments',
    cta: 'Manage appointments',
    available: true,
  },
  {
    slug: 'ticketing-support',
    title: 'SMS Support Inbox',
    description: 'View threads by phone number and reply. Not a full ticketing system (no tickets/queues).',
    path: '/premium/ticketing-support',
    cta: 'Open support inbox',
    available: true,
  },
  {
    slug: 'geo-marketing',
    title: 'Geo-SMS Marketing',
    description:
      'Targets phones inside a radius of a searched place using recent live GPS from your app (optional: saved contact map pins). Server needs LIVE_LOCATION_INGEST_KEY; staff only reach numbers that exist as contacts unless admin enables open audience.',
    path: '/premium/geo-marketing',
    cta: 'Run geo campaign',
    available: true,
  },
  {
    slug: 'two-way-chat',
    title: 'Two-Way SMS',
    description: 'Same inbox as support; replies work by contact or raw phone when you use Send to phone.',
    path: '/premium/two-way-chat',
    cta: 'Open chat inbox',
    available: true,
  },
  {
    slug: 'contact-segment',
    title: 'Contact segment SMS',
    description: 'Tag contacts and broadcast with Send SMS → By segment, or filter contacts by tag.',
    path: '/contacts',
    cta: 'Manage segments',
    available: true,
  },
  {
    slug: 'billing-alerts',
    title: 'SMS billing messages',
    description: 'Manual invoice-style templates with per-contact names; not linked to accounting software.',
    path: '/premium/billing-alerts',
    cta: 'Send billing alerts',
    available: true,
  },
  {
    slug: 'smart-scheduler-ai',
    title: 'Scheduled & recurring campaigns',
    description: 'Pick a send time or repeat daily/weekly/monthly. Server dispatches automatically—no engagement-based AI.',
    path: '/campaign/new',
    cta: 'Schedule campaign',
    available: true,
  },
  {
    slug: 'delivery-reports',
    title: 'Delivery status & network reports',
    description: 'Shows API send results; network delivery updates when Africa\'s Talking delivery-report webhook is configured.',
    path: '/delivery-status',
    cta: 'View reports',
    available: true,
  },
  {
    slug: 'templates-library',
    title: 'SMS templates library',
    description: 'Starter copy with {{name}} and other placeholders filled per recipient at send time.',
    path: '/campaign/new?template=true',
    cta: 'Use templates',
    available: true,
  },
];

export const premiumFeatureBySlug = premiumFeatures.reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});
