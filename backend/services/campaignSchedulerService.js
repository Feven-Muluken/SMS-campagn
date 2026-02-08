const { Op } = require('sequelize');
const { Campaign, CampaignRecipient, Contact, User, Group, Message, CampaignDispatch } = require('../models');
const { sendSMS } = require('./smsService');

const normalizeSenderId = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const addInterval = (date, interval) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  if (interval === 'daily') {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (interval === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (interval === 'monthly') {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    // handle month rollovers (e.g. Jan 31 -> Feb)
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  return null;
};

const resolveCampaignRecipients = async (campaign) => {
  const links = campaign.recipientLinks || [];
  const contactIds = links.filter((l) => l.recipientType === 'Contact').map((l) => l.recipientId);
  const userIds = links.filter((l) => l.recipientType === 'User').map((l) => l.recipientId);

  const [directContacts, directUsers] = await Promise.all([
    contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
    userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
  ]);

  let recipients = [...directContacts, ...directUsers];

  if (campaign.groupId) {
    const group = await Group.findByPk(campaign.groupId, { include: [{ model: Contact, as: 'members' }] });
    if (group && group.members?.length) recipients = [...recipients, ...group.members];
  }

  // unique by model name + id
  const seen = new Set();
  recipients = recipients.filter((r) => {
    const key = `${r.constructor.name}-${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return recipients;
};

const dispatchCampaignOnce = async ({ campaign, scheduledFor, senderId }) => {
  const recipients = await resolveCampaignRecipients(campaign);
  if (!recipients.length) {
    return { successCount: 0, failCount: 0, total: 0, message: 'No recipients found' };
  }

  const content = campaign.message;
  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    const phoneNumber = recipient.phoneNumber || null;
    const recipientType = recipient.constructor.name === 'Contact' ? 'Contact' : 'User';

    if (!phoneNumber) {
      failCount += 1;
      continue;
    }

    try {
      const response = await sendSMS(phoneNumber, content, { senderId });
      await Message.create({
        campaignId: campaign.id,
        recipientType,
        recipientId: recipient.id,
        phoneNumber,
        content,
        status: 'sent',
        response,
        sentAt: new Date(),
      });
      successCount += 1;
    } catch (err) {
      await Message.create({
        campaignId: campaign.id,
        recipientType,
        recipientId: recipient.id,
        phoneNumber,
        content,
        status: 'failed',
        response: { error: err?.message || String(err) },
      });
      failCount += 1;
    }
  }

  return { successCount, failCount, total: recipients.length };
};

const shouldRetryFailed = () => (process.env.CAMPAIGN_SCHEDULER_RETRY_FAILED || '').toLowerCase() === 'true';

const processDueCampaignsOnce = async () => {
  const now = new Date();

  const dueCampaigns = await Campaign.findAll({
    where: {
      schedule: { [Op.ne]: null, [Op.lte]: now },
      status: { [Op.in]: shouldRetryFailed() ? ['pending', 'failed'] : ['pending'] },
    },
    include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['recipientId', 'recipientType'] }],
    order: [['schedule', 'ASC']],
    limit: 50,
  });

  if (!dueCampaigns.length) return;

  const normalizedSenderId = normalizeSenderId(process.env.CAMPAIGN_SENDER_ID || process.env.AT_SENDER_ID);

  for (const campaign of dueCampaigns) {
    // Guard: schedule can be null if a row changed between query + loop
    if (!campaign.schedule) continue;

    const scheduledFor = new Date(campaign.schedule);

    // Prevent duplicate sends for the exact same scheduled time
    const [dispatch, created] = await CampaignDispatch.findOrCreate({
      where: { campaignId: campaign.id, scheduledFor },
      defaults: { status: 'pending' },
    });

    if (!created) {
      if (dispatch.status === 'sent') continue;
      if (dispatch.status === 'failed' && !shouldRetryFailed()) continue;
      // If it's still pending, another worker/tick probably grabbed it.
      if (dispatch.status === 'pending') continue;
    }

    try {
      const result = await dispatchCampaignOnce({ campaign, scheduledFor, senderId: normalizedSenderId });

      await dispatch.update({
        status: result.failCount > 0 && result.successCount === 0 ? 'failed' : 'sent',
        dispatchedAt: new Date(),
        result,
        error: null,
      });

      // Move recurring campaigns forward, otherwise mark as sent
      if (campaign.recurringActive && campaign.recurringInterval) {
        const next = addInterval(scheduledFor, campaign.recurringInterval);
        if (next) {
          await campaign.update({ schedule: next, status: 'pending' });
        } else {
          await campaign.update({ status: 'sent' });
        }
      } else {
        await campaign.update({ status: 'sent' });
      }
    } catch (err) {
      const msg = err?.message || String(err);
      await dispatch.update({ status: 'failed', dispatchedAt: new Date(), error: msg });
      await campaign.update({ status: 'failed' });
    }
  }
};

const startCampaignScheduler = () => {
  const enabled = (process.env.CAMPAIGN_SCHEDULER_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Campaign scheduler disabled (CAMPAIGN_SCHEDULER_ENABLED=false)');
    return;
  }

  const intervalMs = (() => {
    const fromEnv = Number(process.env.CAMPAIGN_SCHEDULER_INTERVAL_MS);
    return Number.isFinite(fromEnv) && fromEnv >= 1000 ? fromEnv : 60_000;
  })();

  console.log(`Campaign scheduler started (interval=${intervalMs}ms)`);

  setInterval(async () => {
    try {
      await processDueCampaignsOnce();
    } catch (err) {
      console.error('Campaign scheduler tick error:', err);
    }
  }, intervalMs);
};

module.exports = {
  startCampaignScheduler,
  processDueCampaignsOnce,
};
