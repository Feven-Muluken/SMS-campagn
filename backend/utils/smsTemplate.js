/**
 * Replace {{key}} placeholders in SMS templates (CreateCampaign, bulk sends).
 * Unknown keys become empty strings.
 */
const personalizeMessage = (template, context = {}) => {
  if (template === null || template === undefined) return '';
  let out = String(template);
  const tv = context.templateVars && typeof context.templateVars === 'object' ? context.templateVars : {};
  const flat = { ...tv };
  if (context.contact && typeof context.contact === 'object') {
    flat.name = flat.name ?? context.contact.name ?? '';
    flat.phoneNumber = flat.phoneNumber ?? context.contact.phoneNumber ?? '';
  }
  if (context.user && typeof context.user === 'object') {
    flat.name = flat.name ?? context.user.name ?? '';
    flat.phoneNumber = flat.phoneNumber ?? context.user.phoneNumber ?? '';
    flat.email = flat.email ?? context.user.email ?? '';
  }
  return out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = flat[key];
    if (v === null || v === undefined) return '';
    return String(v);
  });
};

module.exports = { personalizeMessage };
