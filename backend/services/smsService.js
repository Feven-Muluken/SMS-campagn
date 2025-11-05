const africastalking = require('../config/africastalking');
const Message = require('../models/Message');

const sms = africastalking.SMS;
const sendSMS = async ( phoneNumber, message ) => {
  try{
    const response = await sms.send({
      to: [phoneNumber],
      message
    });
    // const status = response.SMSMessageData.Recipients[0]?.status || 'queued';
    
    // const messageLog = await Message.create({
    //   sender: senderID,
    //   recipient,
    //   content,
    //   status,
    //   campaign,
    // });

    // return messageLog;
    return response
  } catch (error) {
    console.error('Africa\'s Talking error:', error.message);
    throw new Error('Failed to send SMS', error.message);
  }
};

module.exports = { sendSMS }