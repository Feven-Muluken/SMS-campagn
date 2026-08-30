const axios = require('axios');

/**
 * MobileSMS.io / configurable HTTP SMS gateway.
 * Set MOBILESMS_IO_BASE_URL and MOBILESMS_IO_API_KEY from your MobileSMS.io (or partner) business SMS dashboard.
 * Field names and paths are configurable so you can match the vendor JSON without code changes.
 */
const getByPath = (obj, path) => {
  if (!path || obj == null) return null;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[p];
  }
  return cur === undefined ? null : cur;
};

const parseExtraJson = () => {
  const raw = process.env.MOBILESMS_IO_EXTRA_JSON;
  if (!raw || !String(raw).trim()) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

const getConfig = () => ({
  baseURL: String(process.env.MOBILESMS_IO_BASE_URL || '').trim().replace(/\/+$/, ''),
  apiKey: String(process.env.MOBILESMS_IO_API_KEY || '').trim(),
  sendPath: String(process.env.MOBILESMS_IO_SEND_PATH || '/sms/send').trim(),
  authStyle: String(process.env.MOBILESMS_IO_AUTH_STYLE || 'bearer').toLowerCase(),
  requestFormat: String(process.env.MOBILESMS_IO_REQUEST_FORMAT || 'json').trim().toLowerCase(),
  apiKeyHeaderName: String(process.env.MOBILESMS_IO_API_KEY_HEADER || 'X-API-Key').trim(),
  fieldTo: String(process.env.MOBILESMS_IO_FIELD_TO || 'to').trim(),
  fieldMessage: String(process.env.MOBILESMS_IO_FIELD_MESSAGE || 'message').trim(),
  fieldFrom: String(process.env.MOBILESMS_IO_FIELD_FROM || 'from').trim(),
  defaultSender: String(
    process.env.MOBILESMS_IO_DEFAULT_SENDER || process.env.MOBILESMS_IO_SENDER_ID || ''
  ).trim(),
  stripPlus: String(process.env.MOBILESMS_IO_STRIP_PLUS || 'false').toLowerCase() === 'true',
  messageIdPath: String(process.env.MOBILESMS_IO_MESSAGE_ID_JSON_PATH || 'message_id').trim(),
  successFlagPath: String(process.env.MOBILESMS_IO_SUCCESS_FLAG_PATH || '').trim(),
  successFlagExpected: process.env.MOBILESMS_IO_SUCCESS_FLAG_EXPECTED,
  timeoutMs: Math.min(Math.max(Number(process.env.MOBILESMS_IO_TIMEOUT_MS) || 30000, 5000), 120000),
  extraJson: parseExtraJson(),
});

const buildUrl = (base, path) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

const send = async (phoneNumber, message, options = {}) => {
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  const cfg = getConfig();
  if (!cfg.baseURL) {
    throw new Error('MOBILESMS_IO_BASE_URL is required when SMS_PROVIDER=mobilesms_io');
  }
  if (!cfg.apiKey && cfg.authStyle !== 'none') {
    throw new Error('MOBILESMS_IO_API_KEY is required when SMS_PROVIDER=mobilesms_io (or set MOBILESMS_IO_AUTH_STYLE=none for open test endpoints)');
  }

  let to = String(phoneNumber).trim();
  if (cfg.stripPlus && to.startsWith('+')) {
    to = to.slice(1);
  }

  const from = (options.from || options.senderId || cfg.defaultSender || '').trim();
  const body = {
    ...cfg.extraJson,
    [cfg.fieldTo]: to,
    [cfg.fieldMessage]: String(message).trim(),
  };
  if (from) {
    body[cfg.fieldFrom] = from;
  }

  const url = buildUrl(cfg.baseURL, cfg.sendPath);
  const headers = {
    Accept: 'application/json, text/plain, */*',
  };

  let requestBody = body;
  if (cfg.requestFormat === 'form') {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    requestBody = form;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (cfg.requestFormat === 'json') {
    headers['Content-Type'] = 'application/json';
  } else {
    throw new Error(`Unknown MOBILESMS_IO_REQUEST_FORMAT: ${cfg.requestFormat}`);
  }

  const axiosConfig = {
    headers,
    timeout: cfg.timeoutMs,
    validateStatus: () => true,
  };

  if (cfg.authStyle === 'bearer') {
    headers.Authorization = `Bearer ${cfg.apiKey}`;
  } else if (cfg.authStyle === 'api_key_header') {
    headers[cfg.apiKeyHeaderName] = cfg.apiKey;
  } else if (cfg.authStyle === 'query') {
    const param = String(process.env.MOBILESMS_IO_QUERY_PARAM || 'api_key').trim() || 'api_key';
    axiosConfig.params = { [param]: cfg.apiKey };
  } else if (cfg.authStyle === 'none') {
    /* no auth header */
  } else {
    throw new Error(`Unknown MOBILESMS_IO_AUTH_STYLE: ${cfg.authStyle}`);
  }

  const res = await axios.post(url, requestBody, axiosConfig);
  const data = res.data;

  if (res.status < 200 || res.status >= 300) {
    const msg =
      (data && (data.message || data.error || data.Message)) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(`MobileSMS.io HTTP SMS failed: ${msg}`);
  }

  if (cfg.successFlagPath) {
    const flag = getByPath(data, cfg.successFlagPath);
    const expected =
      cfg.successFlagExpected !== undefined && cfg.successFlagExpected !== ''
        ? cfg.successFlagExpected
        : true;
    if (String(flag) !== String(expected)) {
      throw new Error(`MobileSMS.io reported failure (path ${cfg.successFlagPath}): ${JSON.stringify(flag)}`);
    }
  }

  let providerMessageId =
    getByPath(data, cfg.messageIdPath) ||
    getByPath(data, 'messageId') ||
    getByPath(data, 'id') ||
    getByPath(data, 'data.id') ||
    getByPath(data, 'data.message_id');

  if (providerMessageId != null && typeof providerMessageId !== 'string') {
    providerMessageId = String(providerMessageId);
  }

  const wrapped = {
    provider: 'mobilesms_io',
    httpStatus: res.status,
    body: data,
  };

  return { response: wrapped, providerMessageId, providerKey: 'mobilesms_io' };
};

module.exports = { send, providerKey: 'mobilesms_io' };
