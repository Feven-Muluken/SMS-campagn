const PLACEHOLDER_PATTERNS = [
  /^change-me/i,
  /^your[_ -]/i,
  /^example/i,
];

const isPlaceholder = (value) => {
  const normalized = String(value || '').trim();
  return !normalized || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
};

const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const errors = [];
  const jwtSecret = String(process.env.JWT_SECRET || '');
  if (isPlaceholder(jwtSecret) || jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be a non-placeholder value of at least 32 characters');
  }
  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '');
  if (isPlaceholder(refreshSecret) || refreshSecret.length < 32 || refreshSecret === jwtSecret) {
    errors.push('JWT_REFRESH_SECRET must be a different non-placeholder value of at least 32 characters');
  }

  const corsOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!corsOrigins.length || corsOrigins.some((origin) => !origin.startsWith('https://'))) {
    errors.push('CORS_ORIGIN must contain only explicit HTTPS origins');
  }

  if (String(process.env.SMS_WEBHOOK_SECRET || '').length < 24) {
    errors.push('SMS_WEBHOOK_SECRET must be at least 24 characters');
  }

  if (String(process.env.LIVE_LOCATION_INGEST_KEY || '').length < 24) {
    errors.push('LIVE_LOCATION_INGEST_KEY must be at least 24 characters');
  }

  if (!String(process.env.DB_PASSWORD || '')) {
    errors.push('DB_PASSWORD must not be empty');
  }

  const frontendUrl = String(process.env.FRONTEND_URL || '');
  if (!frontendUrl.startsWith('https://')) {
    errors.push('FRONTEND_URL must be an explicit HTTPS URL');
  }

  const smtpRequired = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingSmtp = smtpRequired.filter((name) => !String(process.env[name] || '').trim());
  if (missingSmtp.length) {
    errors.push(`Password-reset email requires: ${missingSmtp.join(', ')}`);
  }

  const provider = String(process.env.SMS_PROVIDER || 'africastalking').toLowerCase();
  const providerSelectable = String(process.env.SMS_PROVIDER_USER_SELECTABLE || 'true').toLowerCase() === 'true';
  if (provider === 'africastalking') {
    if (isPlaceholder(process.env.AT_USERNAME) || isPlaceholder(process.env.AT_API_KEY)) {
      errors.push('AT_USERNAME and AT_API_KEY must be configured for Africa\'s Talking');
    }
  } else if (provider === 'mobilesms_io') {
    if (!String(process.env.MOBILESMS_IO_BASE_URL || '').startsWith('https://')) {
      errors.push('MOBILESMS_IO_BASE_URL must be an HTTPS URL');
    }
    if (isPlaceholder(process.env.MOBILESMS_IO_API_KEY)) {
      errors.push('MOBILESMS_IO_API_KEY must be configured');
    }
  } else {
    errors.push('SMS_PROVIDER must be africastalking or mobilesms_io');
  }

  // Selectable routing promises both choices to users, so both integrations
  // must be complete before a production deployment is allowed to start.
  if (providerSelectable) {
    if (isPlaceholder(process.env.AT_USERNAME) || isPlaceholder(process.env.AT_API_KEY)) {
      errors.push('Selectable SMS providers require AT_USERNAME and AT_API_KEY');
    }
    if (!String(process.env.MOBILESMS_IO_BASE_URL || '').startsWith('https://')) {
      errors.push('Selectable SMS providers require an HTTPS MOBILESMS_IO_BASE_URL');
    }
    const mobileAuthStyle = String(process.env.MOBILESMS_IO_AUTH_STYLE || 'bearer').toLowerCase();
    if (mobileAuthStyle !== 'none' && isPlaceholder(process.env.MOBILESMS_IO_API_KEY)) {
      errors.push('Selectable SMS providers require MOBILESMS_IO_API_KEY');
    }
  }

  if (errors.length) {
    throw new Error(`Invalid production configuration:\n- ${errors.join('\n- ')}`);
  }
};

module.exports = { validateProductionConfig };
