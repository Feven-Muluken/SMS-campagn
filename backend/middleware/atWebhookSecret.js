/**
 * Optional shared secret for Africa's Talking inbound / delivery-report webhooks.
 * Set AT_WEBHOOK_SECRET and send the same value as header x-at-webhook-secret or query ?secret=
 */
const verifyAtWebhook = (req, res, next) => {
  const expected = process.env.AT_WEBHOOK_SECRET;
  if (!expected) return next();
  const header = req.headers['x-at-webhook-secret'] || req.headers['x-webhook-secret'];
  const query = req.query && req.query.secret;
  if (header === expected || query === expected) return next();
  return res.status(401).json({ message: 'Invalid webhook secret' });
};

module.exports = { verifyAtWebhook };
