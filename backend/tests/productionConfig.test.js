const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProductionConfig } = require('../config/validateProductionConfig');

const productionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a-secure-production-secret-with-32-chars',
  JWT_REFRESH_SECRET: 'a-different-refresh-secret-with-32-characters',
  SMS_WEBHOOK_SECRET: 'webhook-secret-at-least-24-characters',
  LIVE_LOCATION_INGEST_KEY: 'location-secret-at-least-24-characters',
  DB_PASSWORD: 'database-password',
  SMS_PROVIDER: 'africastalking',
  SMS_PROVIDER_USER_SELECTABLE: 'true',
  AT_USERNAME: 'production-account',
  AT_API_KEY: 'secure-provider-api-key',
  MOBILESMS_IO_BASE_URL: 'https://sms.example.test',
  MOBILESMS_IO_API_KEY: 'secure-mobile-provider-api-key',
  MOBILESMS_IO_AUTH_STYLE: 'bearer',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer@example.test',
  SMTP_PASS: 'smtp-password',
  SMTP_FROM: 'Afroel SMS <mailer@example.test>',
};

const withEnv = (values, callback) => {
  const original = { ...process.env };
  Object.assign(process.env, values);
  try {
    callback();
  } finally {
    process.env = original;
  }
};

test('production configuration accepts secure explicit values', () => {
  withEnv(productionEnv, () => assert.doesNotThrow(validateProductionConfig));
});

test('production configuration rejects placeholder secrets', () => {
  withEnv(
    { ...productionEnv, JWT_SECRET: 'change-me' },
    () => assert.throws(validateProductionConfig, /JWT_SECRET/)
  );
});

test('selectable SMS routing requires both providers to be configured', () => {
  withEnv(
    { ...productionEnv, MOBILESMS_IO_BASE_URL: '', MOBILESMS_IO_API_KEY: '' },
    () => assert.throws(validateProductionConfig, /Selectable SMS providers.*MOBILESMS_IO/s),
  );
});
