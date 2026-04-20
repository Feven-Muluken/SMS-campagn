const { parsePhoneNumberFromString, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Build parse options from environment and optional override.
 * @param {string|{defaultCountry?: string, defaultCallingCode?: string}|undefined} override
 *        ISO country code (e.g. 'ET') or explicit options object.
 */
function getDefaultParseOptions(override) {
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    if (override.defaultCountry || override.defaultCallingCode) {
      return { ...override };
    }
  }
  if (typeof override === 'string' && /^[A-Z]{2}$/i.test(override.trim())) {
    return { defaultCountry: override.trim().toUpperCase() };
  }

  const region = (process.env.DEFAULT_PHONE_REGION || '').trim();
  if (/^[A-Z]{2}$/i.test(region)) {
    return { defaultCountry: region.toUpperCase() };
  }

  const cc = String(process.env.DEFAULT_PHONE_COUNTRY_CODE || '251')
    .replace(/^\+/, '')
    .trim();
  if (/^\d{1,3}$/.test(cc)) {
    return { defaultCallingCode: cc };
  }

  return { defaultCountry: 'ET' };
}

/**
 * Normalize to E.164 using libphonenumber-js (same rules as Google libphonenumber).
 * Handles national formats when DEFAULT_PHONE_REGION or DEFAULT_PHONE_COUNTRY_CODE is set.
 * @returns {string|null} E.164 string or null if not parseable/invalid
 */
function normalizeToE164(input, override) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const options = getDefaultParseOptions(override);

  let parsed = parsePhoneNumberFromString(raw, options);
  if (parsed && parsed.isValid()) {
    return parsed.format('E.164');
  }

  // International input without needing default region (e.g. +251…, +1…)
  if (raw.startsWith('+') || raw.startsWith('00')) {
    const intl = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
    parsed = parsePhoneNumberFromString(intl);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
  }

  return null;
}

/**
 * Whether the string is a valid phone number in E.164 (strict validation).
 */
function isValidE164(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  return isValidPhoneNumber(s);
}

/** @deprecated Use isValidE164 — kept for any code expecting a regex-shaped export */
const E164_RE = /^\+[1-9]\d{1,14}$/;

module.exports = {
  normalizeToE164,
  isValidE164,
  getDefaultParseOptions,
  E164_RE,
};
