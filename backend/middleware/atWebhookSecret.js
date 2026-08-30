/**
 * Optional shared secret for inbound / delivery-report webhooks.
 * Set one of SMS_WEBHOOK_SECRET, MOBILESMS_IO_WEBHOOK_SECRET, or AT_WEBHOOK_SECRET and send the same
 * value as header x-at-webhook-secret, x-webhook-secret, or x-sms-webhook-secret, or query ?secret=
 */
const getExpectedSecret = () =>
  String(
    process.env.SMS_WEBHOOK_SECRET ||
      process.env.MOBILESMS_IO_WEBHOOK_SECRET ||
      process.env.AT_WEBHOOK_SECRET ||
      ''
  ).trim();

const verifyAtWebhook = (req, res, next) => {
  const expected = getExpectedSecret();
  if (!expected) return next();

  const header =
    req.headers['x-at-webhook-secret'] ||
    req.headers['x-webhook-secret'] ||
    req.headers['x-sms-webhook-secret'];
  const query = req.query && req.query.secret;

  if (header === expected || query === expected) return next();
  return res.status(401).json({ message: 'Invalid webhook secret' });
};

module.exports = { verifyAtWebhook };
