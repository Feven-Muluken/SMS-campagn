const africastalking = require('../config/africastalking');

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

      // Log provider response for debugging
      console.log('Africa\'s Talking response:', JSON.stringify(response));

      // Check if response indicates success for the first recipient
      if (response && response.SMSMessageData) {
        const recipient = response.SMSMessageData.Recipients?.[0];
        if (recipient) {
          // statusCode can be a number or string; normalize to number for comparison
          const statusCodeNum = Number(recipient.statusCode);
          if (isNaN(statusCodeNum) || statusCodeNum !== 101) {
            const statusText = recipient.status || recipient.statusCode || 'Unknown';
            const statusDesc = recipient.statusDescription || 'Unknown error';
            throw new Error(`SMS failed: ${statusText} - ${statusDesc}`);
          }
        }
      }

    return response;
  } catch (error) {
    console.error('Africa\'s Talking SMS error:', error);
    // Return a more descriptive error
    const errorMessage = error.message || error.toString() || 'Failed to send SMS';
    throw new Error(`SMS sending failed: ${errorMessage}`);
  }
};

module.exports = { sendSMS }