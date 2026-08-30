const africastalkingProvider = require('./providers/africastalkingProvider');
const mobilesmsIoProvider = require('./providers/mobilesmsIoProvider');

const normalizeProvider = (raw) => {
  const s = String(raw || 'africastalking')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (s === 'mobilesms' || s === 'mobilesms_io' || s === 'mobilesmsio' || s === 'mobile_sms_io') {
    return 'mobilesms_io';
  }
  if (s !== 'africastalking' && s !== 'at' && s !== 'africa' && s !== '') {
    console.warn(`SMS_PROVIDER "${raw}" is not recognized; using africastalking`);
  }
  return 'africastalking';
};

const getDefaultProvider = () => normalizeProvider(process.env.SMS_PROVIDER);

const getImplementation = (providerKey) => {
  const key = providerKey || getDefaultProvider();
  if (key === 'mobilesms_io') return mobilesmsIoProvider;
  return africastalkingProvider;
};

const isProviderSelectable = () => String(process.env.SMS_PROVIDER_USER_SELECTABLE || 'true').toLowerCase() === 'true';

/**
 * Outbound SMS entry: picks provider from options.provider (if allowed) or SMS_PROVIDER fallback.
 * options.provider can override the default provider if SMS_PROVIDER_USER_SELECTABLE=true
 */
const sendSMS = async (phoneNumber, message, options = {}) => {
  let providerKey = getDefaultProvider();
  
  // Allow per-request provider override if enabled
  if (isProviderSelectable() && options.provider) {
    const requested = normalizeProvider(options.provider);
    if (requested !== providerKey) {
      console.log(`SMS: provider override ${requested} (default: ${providerKey})`);
    }
    providerKey = requested;
  }

  const impl = getImplementation(providerKey);
  try {
    const result = await impl.send(phoneNumber, message, options);
    return { ...result, provider: providerKey };
  } catch (error) {
    console.error(`SMS provider (${providerKey}) error:`, error);
    const errorMessage = error.message || error.toString() || 'Failed to send SMS';
    throw new Error(`SMS sending failed: ${errorMessage}`);
  }
};

const extractProviderMessageId = (response) => {
  if (!response || typeof response !== 'object') return null;
  if (response.SMSMessageData) {
    return africastalkingProvider.extractProviderMessageId(response);
  }
  if (response.provider === 'mobilesms_io' && response.body) {
    const path = String(process.env.MOBILESMS_IO_MESSAGE_ID_JSON_PATH || 'message_id').trim();
    const data = response.body;
    const parts = path.split('.').filter(Boolean);
    let cur = data;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = cur[p];
    }
    if (cur === undefined || cur === null) return null;
    return String(cur);
  }
  return null;
};

const describeActiveProvider = () => {
  const defaultProvider = getDefaultProvider();
  return {
    default: defaultProvider,
    available: ['africastalking', 'mobilesms_io'],
    userSelectable: isProviderSelectable(),
    routing: 'env-with-override',
    envVar: 'SMS_PROVIDER',
    envVarSelectable: 'SMS_PROVIDER_USER_SELECTABLE',
  };
};

module.exports = { sendSMS, extractProviderMessageId, getDefaultProvider, describeActiveProvider, isProviderSelectable };
