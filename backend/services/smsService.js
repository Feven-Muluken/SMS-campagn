const { sendSMS, extractProviderMessageId, describeActiveProvider } = require('./sms/smsRouter');

module.exports = { sendSMS, extractProviderMessageId, describeActiveProvider };
