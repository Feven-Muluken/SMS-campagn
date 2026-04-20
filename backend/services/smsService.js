const africastalking = require('../config/africastalking');

const extractProviderMessageId = (response) => {
  try {
    const r = response?.SMSMessageData?.Recipients?.[0];
    if (!r || typeof r !== 'object') return null;
    return r.messageId || r.message_id || r.requestId || null;
  } catch {
    return null;
  }
};

const sendSMS = async (phoneNumber, message, options = {}) => {
  try {
    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }

    const sms = africastalking.SMS;
    if (!sms) {
      throw new Error('Africa\'s Talking SMS service not initialized. Check API credentials.');
    }

    const payload = {
      to: [phoneNumber],
      message: message.trim(),
    };

    const from = (options.from || options.senderId || process.env.AT_SENDER_ID || '').trim();
    if (from) payload.from = from;

    const response = await sms.send(payload);

    console.log('Africa\'s Talking response:', JSON.stringify(response));

    if (response && response.SMSMessageData) {
      const recipient = response.SMSMessageData.Recipients?.[0];
      if (recipient) {
        const statusCodeNum = Number(recipient.statusCode);
        if (isNaN(statusCodeNum) || statusCodeNum !== 101) {
          const statusText = recipient.status || recipient.statusCode || 'Unknown';
          const statusDesc = recipient.statusDescription || 'Unknown error';
          throw new Error(`SMS failed: ${statusText} - ${statusDesc}`);
        }
      }
    }

    const providerMessageId = extractProviderMessageId(response);
    return { response, providerMessageId };
  } catch (error) {
    console.error('Africa\'s Talking SMS error:', error);
    const errorMessage = error.message || error.toString() || 'Failed to send SMS';
    throw new Error(`SMS sending failed: ${errorMessage}`);
  }
};

module.exports = { sendSMS, extractProviderMessageId };