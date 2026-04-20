/**
 * Normalize Africa's Talking webhook bodies (JSON or form fields vary by product/version).
 */
const pickInbound = (body = {}) => {
  const from =
    body.from ||
    body.phoneNumber ||
    body.phone ||
    body.msisdn ||
    '';
  const text = body.text || body.message || body.body || '';
  const id = body.id || body.messageId || body.linkId || null;
  const date = body.date || body.createdAt || body.timestamp || null;
  return {
    from: String(from).trim(),
    text: String(text).trim(),
    id,
    date,
    raw: body,
  };
};

const pickDeliveryReport = (body = {}) => ({
  messageId: body.id || body.messageId || null,
  status: body.status || body.Status || null,
  phoneNumber: body.phoneNumber || body.phone || null,
  networkCode: body.networkCode || null,
  failureReason: body.failureReason || body.reason || '',
  retryCount: body.retryCount,
  raw: body,
});

module.exports = { pickInbound, pickDeliveryReport };
