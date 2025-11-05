const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const { sendSMS } = require('../services/smsService');


const sendCampaignMessages = async (req, res) => {
  const { campaignID } = req.body;
  try{
    const campaign = await Campaign.findById(campaignID).populate('recipients');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    for (const recipient of campaign.recipients){
      const phone = recipient.phoneNumber;
      const content = campaign.message;

      try{
        const response = await sendSMS(phone, content);

        await Message.create({
          campaign: campaign._id,
          recipient: recipient._id,
          recipientType: campaign.recipientType,
          phoneNumber: phone,
          content,
          status: 'sent',
          response,
          sentAt: new Date()
        });
      } catch (error) {
        await Message.create({
          campaign: campaign._id,
          recipient: recipient._id,
          recipientType: campaign.recipientType,
          phoneNumber: phone,
          content,
          status: 'failed',
          response: { error: error.message },
        });
      }
    }
    campaign.status = 'sent';
    await campaign.save();

    res.json({ message: 'Campaign messages dispatched' });
  } catch (error) {
    console.error('SMS dispatch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
  
}
//   try {
//     const campaign = await campaign
//     const { recipient, content, campaign } = req.body;
//     if (!recipient || !content) {
//       return res.status(400).json({ Message: 'Recipient and content are required' });
//     }
//     const messageLog = await sendSMS({
//       senderID: req.user._id,
//       recipient,
//       content,
//       campaign,
//     });

//     res.status(200).json({
//       message: 'SMS sent successfully',
//       data: messageLog,
//     });
//   } catch (error) {
//     console.error(' SMS Error ', error );
//     res.status(500).json({ message: error.message });
//   }
// };

// const stats = async (req, res, next) => {
//   try{
//     const { name } = req.params;
//     const stats = await Message.aggregate([

//       { $match: { campaign: name } },
//       { $group: { _id: '$status', count: { $sum: 1 } } },

//     ]);

//     res.json({ campaign: name, stats });
//   } catch (error){
//     console.error('Analytics error: ', error);
//     res.status(500).json({ message: 'Server error'});
//     next(error);
//   }
  
// };


module.exports = { sendCampaignMessages };