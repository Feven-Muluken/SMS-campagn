const { Campaign, CampaignRecipient, Contact, User, Group, Message } = require('../models');
const { sendSMS } = require('../services/smsService');
const { Op } = require('sequelize');

const sendCampaignMessages = async (req, res) => {
  const { campaignID } = req.body;
  try {
    if (!campaignID) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }

    const campaign = await Campaign.findByPk(campaignID, {
      include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['recipientId', 'recipientType'] }]
    });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (req.user?.role !== 'admin' && campaign.createdById !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let recipients = [];
    const links = campaign.recipientLinks || [];
    const contactIds = links.filter((l) => l.recipientType === 'Contact').map((l) => l.recipientId);
    const userIds = links.filter((l) => l.recipientType === 'User').map((l) => l.recipientId);

    const [directContacts, directUsers] = await Promise.all([
      contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
      userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
    ]);

    recipients = [...directContacts, ...directUsers];

    if (campaign.groupId) {
      const group = await Group.findByPk(campaign.groupId, { include: [{ model: Contact, as: 'members' }] });
      if (group && group.members?.length) {
        recipients = [...recipients, ...group.members];
      }
    }

    // unique by id+type
    const seen = new Set();
    recipients = recipients.filter((r) => {
      const key = `${r.constructor.name}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found for this campaign' });
    }

    const content = campaign.message;
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      let phone = recipient.phoneNumber || null;
      const type = recipient.constructor.name === 'Contact' ? 'Contact' : 'User';

      if (!phone) {
        failCount += 1;
        continue;
      }

      try {
        const response = await sendSMS(phone, content);
        await Message.create({
          campaignId: campaign.id,
          recipientType: type,
          recipientId: recipient.id,
          phoneNumber: phone,
          content,
          status: 'sent',
          response,
          sentAt: new Date(),
        });
        successCount += 1;
      } catch (error) {
        await Message.create({
          campaignId: campaign.id,
          recipientType: type,
          recipientId: recipient.id,
          phoneNumber: phone,
          content,
          status: 'failed',
          response: { error: error.message || 'Unknown error' },
        });
        failCount += 1;
      }
    }

    await campaign.update({ status: 'sent' });

    res.json({
      message: 'Campaign messages dispatched',
      successCount,
      failCount,
      total: recipients.length,
    });
  } catch (error) {
    console.error('SMS dispatch error:', error, { campaignID });
    const errorMessage = error.message || error.toString() || 'Server error';
    const resp = { message: 'Failed to dispatch campaign messages', error: errorMessage };
    if (process.env.NODE_ENV !== 'production') resp.stack = error.stack;
    res.status(500).json(resp);
  }
};

const sendGroupSMS = async (req, res) => {
  const { groupId, message } = req.body;
  try {
    if (!groupId || !message) {
      return res.status(400).json({ message: 'Group ID and message are required' });
    }

    const group = await Group.findByPk(groupId, { include: [{ model: Contact, as: 'members' }] });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const contacts = group.members || [];
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'Group has no members' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        failCount++;
        continue;
      }

      try {
        const response = await sendSMS(contact.phoneNumber, message);

        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'sent',
          response,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
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

    const contacts = await Contact.findAll({ where: { id: contactIds } });

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
        failCount++;
        continue;
      }

      try {
        const response = await sendSMS(contact.phoneNumber, message);

        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content: message,
          status: 'sent',
          response,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        const errorMessage = error.message || error.toString() || 'Unknown error';
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
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
const getDeliveryStatus = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = ['sent_at', 'sentAt', 'created_at', 'createdAt', 'status'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            [Op.or]: [
              { phoneNumber: { [ilike]: `%${search}%` } },
              { content: { [ilike]: `%${search}%` } },
            ],
          }
        : {}),
      ...((startDate || endDate)
        ? {
            [Op.and]: [
              startDate ? { createdAt: { [Op.gte]: startDate } } : {},
              endDate ? { createdAt: { [Op.lte]: endDate } } : {},
            ],
          }
        : {}),
    };

    const { rows, count } = await Message.findAndCountAll({
      where,
      include: [{ model: Campaign, as: 'campaign', attributes: ['id', 'name'] }],
      order: [[sortBy, sortDir]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      data: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Failed to fetch delivery status', error);
    res.status(500).json({ message: 'Failed to fetch delivery status' });
  }
};

module.exports = { sendCampaignMessages, sendGroupSMS, sendContactsSMS, getDeliveryStatus };