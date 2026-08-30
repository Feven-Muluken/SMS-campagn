/**
 * Provider-agnostic webhook body normalization for inbound SMS and delivery reports.
 * Supports Africa's Talking and MobileSMS.io, with env-driven field overrides for vendor-specific payloads.
 */
const getByPath = (obj, path) => {
  if (!obj || !path) return null;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[part];
  }
  return cur === undefined ? null : cur;
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const pickInbound = (body = {}) => {
  const mobileSmsPaths = {
    from: String(process.env.MOBILESMS_IO_WEBHOOK_FROM_PATH || '').trim(),
    text: String(process.env.MOBILESMS_IO_WEBHOOK_TEXT_PATH || '').trim(),
    id: String(process.env.MOBILESMS_IO_WEBHOOK_MESSAGE_ID_PATH || '').trim(),
    date: String(process.env.MOBILESMS_IO_WEBHOOK_DATE_PATH || '').trim(),
  };

  const from = firstDefined(
    getByPath(body, mobileSmsPaths.from),
    body.from,
    body.sender,
    body.originator,
    body.source,
    body.phoneNumber,
    body.phone,
    body.msisdn,
    body.mobile,
    body.msisdnNumber,
    body.senderNumber,
    body.sourceAddress,
    ''
  );

  const text = firstDefined(
    getByPath(body, mobileSmsPaths.text),
    body.text,
    body.message,
    body.body,
    body.content,
    body.sms,
    body.messageText,
    body.smsText,
    ''
  );

  const id = firstDefined(
    getByPath(body, mobileSmsPaths.id),
    body.id,
    body.messageId,
    body.message_id,
    body.linkId,
    body.smsId,
    body.sms_id,
    body.reference,
    null
  );

  const date = firstDefined(
    getByPath(body, mobileSmsPaths.date),
    body.date,
    body.createdAt,
    body.created_at,
    body.timestamp,
    body.sentAt,
    body.sent_at,
    null
  );

  return {
    from: String(from || '').trim(),
    text: String(text || '').trim(),
    id: id == null ? null : id,
    date: date == null ? null : date,
    raw: body,
  };
};

const pickDeliveryReport = (body = {}) => {
  const mobileSmsPaths = {
    messageId: String(process.env.MOBILESMS_IO_WEBHOOK_MESSAGE_ID_PATH || '').trim(),
    status: String(process.env.MOBILESMS_IO_WEBHOOK_STATUS_PATH || '').trim(),
    phoneNumber: String(process.env.MOBILESMS_IO_WEBHOOK_PHONE_PATH || '').trim(),
    networkCode: String(process.env.MOBILESMS_IO_WEBHOOK_NETWORK_CODE_PATH || '').trim(),
    failureReason: String(process.env.MOBILESMS_IO_WEBHOOK_FAILURE_REASON_PATH || '').trim(),
    retryCount: String(process.env.MOBILESMS_IO_WEBHOOK_RETRY_COUNT_PATH || '').trim(),
  };

  const messageId = firstDefined(
    getByPath(body, mobileSmsPaths.messageId),
    body.id,
    body.messageId,
    body.message_id,
    body.smsId,
    body.sms_id,
    body.reference,
    body.messageReference,
    null
  );

  const status = firstDefined(
    getByPath(body, mobileSmsPaths.status),
    body.status,
    body.Status,
    body.deliveryStatus,
    body.delivery_status,
    body.messageStatus,
    body.message_status,
    body.state,
    null
  );

  const phoneNumber = firstDefined(
    getByPath(body, mobileSmsPaths.phoneNumber),
    body.phoneNumber,
    body.phone,
    body.msisdn,
    body.mobile,
    null
  );

  const networkCode = firstDefined(
    getByPath(body, mobileSmsPaths.networkCode),
    body.networkCode,
    body.network_code,
    body.operatorCode,
    body.operator_code,
    null
  );

  const failureReason = firstDefined(
    getByPath(body, mobileSmsPaths.failureReason),
    body.failureReason,
    body.failure_reason,
    body.reason,
    body.error,
    ''
  );

  const retryCount = firstDefined(
    getByPath(body, mobileSmsPaths.retryCount),
    body.retryCount,
    body.retry_count,
    null
  );

  return {
    messageId: messageId == null ? null : messageId,
    status: status == null ? null : status,
    phoneNumber: phoneNumber == null ? null : phoneNumber,
    networkCode: networkCode == null ? null : networkCode,
    failureReason: String(failureReason || ''),
    retryCount: retryCount == null ? null : retryCount,
    raw: body,
  };
};

module.exports = { pickInbound, pickDeliveryReport };
