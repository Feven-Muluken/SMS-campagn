const { sendSMS, extractProviderMessageId, describeActiveProvider, getDefaultProvider } = require('./sms/smsRouter');

module.exports = { sendSMS, extractProviderMessageId, describeActiveProvider, getDefaultProvider };
