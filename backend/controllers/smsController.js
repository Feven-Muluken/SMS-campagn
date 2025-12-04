const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const { sendSMS } = require('../services/smsService');


const sendCampaignMessages = async (req, res) => {
  const { campaignID } = req.body;
  try {
    console.log(`sendCampaignMessages called for campaignID=${campaignID} by user=${req.user?._id}`);
    if (!campaignID) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }

    const campaign = await Campaign.findById(campaignID);
    console.log('Loaded campaign:', campaign ? { id: campaign._id, name: campaign.name, recipientType: campaign.recipientType, recipientsCount: campaign.recipients?.length, group: campaign.group } : null);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Get recipients based on recipientType
    let recipients = [];
    if (campaign.recipients && campaign.recipients.length > 0) {
      if (campaign.recipientType === 'Contact') {
        const Contact = require('../models/Contact');
        recipients = await Contact.find({ _id: { $in: campaign.recipients } });
      } else if (campaign.recipientType === 'User') {
        const User = require('../models/User');
        recipients = await User.find({ _id: { $in: campaign.recipients } }).select('-password');
      }
    }

    if (campaign.group) {
      const Group = require('../models/Group');
      const Contact = require('../models/Contact');
      // populate canonical `members` field
      const group = await Group.findById(campaign.group).populate('members');
      if (group) {
        // use canonical members array
        const groupMembers = Array.isArray(group.members) ? group.members : [];

        // If members were populated, convert to ids
        const memberIds = groupMembers.map(m => (m && m._id) ? String(m._id) : String(m));
        console.log('Group members resolved (ids):', memberIds);

        if (memberIds.length > 0) {
          const groupContacts = await Contact.find({ _id: { $in: memberIds } });
          recipients = [...recipients, ...groupContacts];
        } else {
          // fallback: find contacts that reference this group in their `groups` field
          const referencedContacts = await Contact.find({ groups: campaign.group });
          if (referencedContacts && referencedContacts.length > 0) {
            recipients = [...recipients, ...referencedContacts];
          }
        }
      } else {
        console.warn(`Campaign ${campaign._id} references a non-existing group ${campaign.group}`);
      }
    }

    // remove duplicate recipients (by _id) and ensure phone numbers will be handled later
    recipients = recipients.filter((v, i, a) => a.findIndex(x => String(x._id) === String(v._id)) === i);

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found for this campaign' });
    }

      const content = campaign.message;
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      // Get phone number based on recipient type
      let phone = null;
      if (campaign.recipientType === 'Contact') {
        phone = recipient.phoneNumber;
      } else if (campaign.recipientType === 'User') {
        // Users might not have phoneNumber, skip if not available
        phone = recipient.phoneNumber || null;
      } else {
        // Fallback: try to get phoneNumber from any recipient
        phone = recipient.phoneNumber || null;
      }

      if (!phone) {
        console.warn(`Skipping recipient ${recipient._id}: no phone number`);
        failCount++;
        continue;
      }

      try {
        const response = await sendSMS(phone, content);

        await Message.create({
          campaign: campaign._id,
          recipients: [recipient._id],
          recipientType: campaign.recipientType,
          phoneNumber: phone,
          content,
          status: 'sent',
          response,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, error);
        const errorMessage = error.message || error.toString() || 'Unknown error';
        await Message.create({
          campaign: campaign._id,
          recipients: [recipient._id],
          recipientType: campaign.recipientType,
          phoneNumber: phone,
          content,
          status: 'failed',
          response: { error: errorMessage },
        });
        failCount++;
      }
    }

    campaign.status = 'sent';
    await campaign.save();

    res.json({
      message: 'Campaign messages dispatched',
      successCount,
      failCount,
      total: recipients.length
    });
  } catch (error) {
    console.error('SMS dispatch error:', error, { campaignID });
    // log stack to server console for easier debugging
    console.error(error.stack);
    const errorMessage = error.message || error.toString() || 'Server error';
    // Include stack in response when NODE_ENV is not production to aid debugging
    const resp = { message: 'Failed to dispatch campaign messages', error: errorMessage };
    if (process.env.NODE_ENV !== 'production') resp.stack = error.stack;
    res.status(500).json(resp);
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


const sendGroupSMS = async (req, res) => {
  const { groupId, message } = req.body;
  try {
    if (!groupId || !message) {
      return res.status(400).json({ message: 'Group ID and message are required' });
    }

    const Group = require('../models/Group');
    const group = await Group.findById(groupId).populate('members').populate('members');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const groupMembers = group.members || group.members || [];
    if (groupMembers.length === 0) {
      return res.status(400).json({ message: 'Group has no members' });
    }

    const Contact = require('../models/Contact');
    const contacts = await Contact.find({ _id: { $in: groupMembers } });

    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found in group' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        console.warn(`Skipping contact ${contact._id}: no phone number`);
        failCount++;
        continue;
      }

      try {
        const response = await sendSMS(contact.phoneNumber, message);

        await Message.create({
          recipients: [contact._id],
          recipientType: 'Contact',
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'sent',
          response,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.phoneNumber}:`, error);
        await Message.create({
          recipients: [contact._id],
          recipientType: 'Contact',
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'failed',
          response: { error: error.message },
        });
        failCount++;
      }
    }

    res.json({
      message: 'Group SMS dispatched',
      successCount,
      failCount,
      total: contacts.length
    });
  } catch (error) {
    console.error('Group SMS dispatch error:', error);
    const errorMessage = error.message || error.toString() || 'Server error';
    res.status(500).json({ 
      message: 'Failed to send group SMS', 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const sendContactsSMS = async (req, res) => {
  const { contactIds, message } = req.body;
  try {
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ message: 'Contact IDs array is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const Contact = require('../models/Contact');
    const contacts = await Contact.find({ _id: { $in: contactIds } });

    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found' });
    }

    if (contacts.length !== contactIds.length) {
      return res.status(400).json({ message: 'Some contact IDs are invalid' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        console.warn(`Skipping contact ${contact._id}: no phone number`);
        failCount++;
        continue;
      }

      try {
        const response = await sendSMS(contact.phoneNumber, message);

        await Message.create({
          recipients: [contact._id],
          recipientType: 'Contact',
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'sent',
          response,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.phoneNumber}:`, error);
        const errorMessage = error.message || error.toString() || 'Unknown error';
        await Message.create({
          recipients: [contact._id],
          recipientType: 'Contact',
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'failed',
          response: { error: errorMessage },
        });
        failCount++;
      }
    }

    res.json({
      message: 'Contacts SMS dispatched',
      successCount,
      failCount,
      total: contacts.length
    });
  } catch (error) {
    console.error('Contacts SMS dispatch error:', error);
    const errorMessage = error.message || error.toString() || 'Server error';
    res.status(500).json({ 
      message: 'Failed to send contacts SMS', 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = { sendCampaignMessages, sendGroupSMS, sendContactsSMS };