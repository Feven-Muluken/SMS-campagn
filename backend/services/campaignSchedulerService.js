const { Op } = require('sequelize');
const { Campaign, CampaignRecipient, Contact, User, Group, Message, CampaignDispatch, CompanySenderId } = require('../models');
const { sendSMS } = require('./smsService');
const { personalizeMessage } = require('../utils/smsTemplate');

const normalizeSenderId = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const addInterval = (date, interval) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  if (interval === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  if (interval === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }
  if (interval === 'monthly') {
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + 1);
    // handle month rollovers (e.g. Jan 31 -> Feb)
    if (d.getUTCDate() < day) d.setUTCDate(0);
    return d;
  }

  return null;
};

const nextOccurrenceAfter = (scheduledFor, interval, reference = new Date()) => {
  let next = addInterval(scheduledFor, interval);
  let guard = 0;
  while (next && next <= reference && guard < 10_000) {
    next = addInterval(next, interval);
    guard += 1;
  }
  return next;
};

const resolveCampaignRecipients = async (campaign) => {
  const links = campaign.recipientLinks || [];
  const contactIds = links.filter((l) => l.recipientType === 'Contact').map((l) => l.recipientId);
  const userIds = links.filter((l) => l.recipientType === 'User').map((l) => l.recipientId);

  const [directContacts, directUsers] = await Promise.all([
    contactIds.length ? Contact.findAll({
      where: {
        id: contactIds,
        ...(campaign.companyId ? { companyId: campaign.companyId } : { createdById: campaign.createdById }),
      },
    }) : [],
    userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
  ]);

  let recipients = [...directContacts, ...directUsers];

  if (campaign.type === 'broadcast/everyone') {
    const broadcastContacts = await Contact.findAll({
      where: campaign.companyId
        ? { companyId: campaign.companyId }
        : { createdById: campaign.createdById },
    });
    recipients = [...recipients, ...broadcastContacts];
  }

  if (campaign.groupId) {
    const group = await Group.findByPk(campaign.groupId, {
      include: [{ model: Contact, as: 'members', through: { attributes: [] } }],
    });
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

/** Pending rows for future schedules so Delivery Status can show “pending” until send. */
const seedPendingMessagesForCampaign = async (campaignId) => {
  const campaign = await Campaign.findByPk(campaignId, {
    include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['recipientId', 'recipientType'] }],
  });
  if (!campaign?.schedule) return;
  if (new Date(campaign.schedule) <= new Date()) return;

  const scheduledFor = new Date(campaign.schedule);
  const [dispatch] = await CampaignDispatch.findOrCreate({
    where: { campaignId: campaign.id, scheduledFor },
    defaults: { status: 'pending' },
  });

  const recipients = await resolveCampaignRecipients(campaign);
  for (const r of recipients) {
    const phoneNumber = r.phoneNumber;
    if (!phoneNumber) continue;
    const recipientType = r.constructor.name === 'Contact' ? 'Contact' : 'User';
    const already = await Message.findOne({
      where: {
        campaignId: campaign.id,
        recipientId: r.id,
        recipientType,
        status: 'pending',
      },
    });
    if (already) continue;
    const content = personalizeMessage(campaign.message, {
      contact: recipientType === 'Contact' ? r : undefined,
      user: recipientType === 'User' ? r : undefined,
    });
    await Message.create({
      companyId: campaign.companyId || null,
      campaignId: campaign.id,
      groupId: campaign.groupId || null,
      recipientType,
      recipientId: r.id,
      phoneNumber,
      content,
      status: 'pending',
      response: {
        direction: 'outbound',
        dispatch: {
          dispatchId: String(dispatch.id),
          scheduledFor: scheduledFor.toISOString(),
        },
      },
    });
  }
};

const dispatchCampaignOnce = async ({ campaign, dispatch, scheduledFor, senderId }) => {
  const recipients = await resolveCampaignRecipients(campaign);
  if (!recipients.length) {
    return { successCount: 0, failCount: 0, total: 0, message: 'No recipients found' };
  }

  const template = campaign.message;
  let successCount = 0;
  let failCount = 0;

  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    if (index > 0 && index % 25 === 0) {
      await dispatch.update({ dispatchedAt: new Date() }, { silent: true });
    }
    const phoneNumber = recipient.phoneNumber || null;
    const recipientType = recipient.constructor.name === 'Contact' ? 'Contact' : 'User';

    if (!phoneNumber) {
      failCount += 1;
      continue;
    }

    const content = personalizeMessage(template, {
      contact: recipientType === 'Contact' ? recipient : undefined,
      user: recipientType === 'User' ? recipient : undefined,
    });

    const existing = await Message.findOne({
      where: {
        campaignId: campaign.id,
        recipientId: recipient.id,
        recipientType,
        status: 'pending',
      },
    });

    const dispatchMetadata = {
      direction: 'outbound',
      dispatch: {
        dispatchId: String(dispatch.id),
        scheduledFor: scheduledFor.toISOString(),
      },
    };

    try {
      const { response, providerMessageId, provider } = await sendSMS(phoneNumber, content, { senderId });
      if (existing) {
        await existing.update({
          companyId: campaign.companyId || null,
          content,
          status: 'sent',
          response: { ...dispatchMetadata, providerResponse: response },
          providerMessageId,
          provider,
          sentAt: new Date(),
          failedAt: null,
        });
      } else {
        await Message.create({
          companyId: campaign.companyId || null,
          campaignId: campaign.id,
          groupId: campaign.groupId || null,
          recipientType,
          recipientId: recipient.id,
          phoneNumber,
          content,
          status: 'sent',
          response: { ...dispatchMetadata, providerResponse: response },
          providerMessageId,
          provider,
          sentAt: new Date(),
        });
      }
      successCount += 1;
    } catch (err) {
      if (existing) {
        await existing.update({
          companyId: campaign.companyId || null,
          content,
          status: 'failed',
          response: { ...dispatchMetadata, error: err?.message || String(err) },
          failedAt: new Date(),
        });
      } else {
        await Message.create({
          companyId: campaign.companyId || null,
          campaignId: campaign.id,
          groupId: campaign.groupId || null,
          recipientType,
          recipientId: recipient.id,
          phoneNumber,
          content,
          status: 'failed',
          response: { ...dispatchMetadata, error: err?.message || String(err) },
          failedAt: new Date(),
        });
      }
      failCount += 1;
    }
  }

  return { successCount, failCount, total: recipients.length };
};

const failPendingMessagesForDispatch = async ({ campaign, dispatch, scheduledFor, error }) => {
  const pending = await Message.findAll({
    where: { campaignId: campaign.id, status: 'pending' },
  });
  for (const message of pending) {
    await message.update({
      status: 'failed',
      failedAt: new Date(),
      response: {
        direction: 'outbound',
        dispatch: {
          dispatchId: String(dispatch.id),
          scheduledFor: scheduledFor.toISOString(),
        },
        error,
      },
    });
  }
};

const shouldRetryFailed = () => (process.env.CAMPAIGN_SCHEDULER_RETRY_FAILED || '').toLowerCase() === 'true';

const dispatchClaimTimeoutMs = () => {
  const configured = Number(process.env.CAMPAIGN_DISPATCH_CLAIM_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 60_000 ? configured : 10 * 60_000;
};

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

  const fallbackSenderId = normalizeSenderId(process.env.CAMPAIGN_SENDER_ID || process.env.AT_SENDER_ID);

  for (const campaign of dueCampaigns) {
    // Guard: schedule can be null if a row changed between query + loop
    if (!campaign.schedule) continue;

    const scheduledFor = new Date(campaign.schedule);
    const companySender = campaign.companyId
      ? await CompanySenderId.findOne({
          where: { companyId: campaign.companyId, status: 'approved', isActive: true },
          order: [['createdAt', 'ASC']],
        })
      : null;
    const effectiveSenderId = companySender?.senderId || fallbackSenderId;

    // Prevent duplicate sends for the exact same scheduled time
    const [dispatch, created] = await CampaignDispatch.findOrCreate({
      where: { campaignId: campaign.id, scheduledFor },
      defaults: { status: 'pending' },
    });

    // Atomically claim the dispatch. Previously, findOrCreate returned a newly
    // created `pending` row and the code immediately skipped it as though a
    // different worker had created it. That meant scheduled campaigns never
    // reached dispatchCampaignOnce. dispatchedAt doubles as the claim marker
    // while the send is in progress and is replaced with the completion time.
    let claimed = false;
    if (created || dispatch.status === 'pending') {
      const staleBefore = new Date(Date.now() - dispatchClaimTimeoutMs());
      const [claimCount] = await CampaignDispatch.update(
        { dispatchedAt: new Date() },
        {
          where: {
            id: dispatch.id,
            status: 'pending',
            [Op.or]: [
              { dispatchedAt: null },
              { dispatchedAt: { [Op.lt]: staleBefore } },
            ],
          },
        }
      );
      claimed = claimCount === 1;
    } else if (dispatch.status === 'failed' && shouldRetryFailed()) {
      const [claimCount] = await CampaignDispatch.update(
        { status: 'pending', dispatchedAt: new Date(), error: null },
        { where: { id: dispatch.id, status: 'failed' } }
      );
      claimed = claimCount === 1;
    }

    if (!claimed) continue;

    try {
      const result = await dispatchCampaignOnce({
        campaign,
        dispatch,
        scheduledFor,
        senderId: effectiveSenderId,
      });

      const dispatchStatus = result.successCount === 0
        ? 'failed'
        : result.failCount > 0
          ? 'partial'
          : 'sent';

      await dispatch.update({
        status: dispatchStatus,
        dispatchedAt: new Date(),
        result,
        error: dispatchStatus === 'failed' ? (result.message || 'No messages were sent') : null,
      });

      // Move recurring campaigns forward, otherwise mark as sent
      if (campaign.recurringActive && campaign.recurringInterval) {
        const next = nextOccurrenceAfter(scheduledFor, campaign.recurringInterval, new Date());
        const recurrenceEnd = campaign.recurrenceEndAt
          ? new Date(campaign.recurrenceEndAt)
          : null;
        if (next && (!recurrenceEnd || next <= recurrenceEnd)) {
          await campaign.update({ schedule: next, status: 'pending' });
          await seedPendingMessagesForCampaign(campaign.id);
        } else {
          const finalStatus = result.successCount === 0
            ? 'failed'
            : result.failCount > 0
              ? 'partial'
              : 'sent';
          await campaign.update({ status: finalStatus });
        }
      } else {
        const finalStatus = result.successCount === 0
          ? 'failed'
          : result.failCount > 0
            ? 'partial'
            : 'sent';
        await campaign.update({ status: finalStatus });
      }
    } catch (err) {
      const msg = err?.message || String(err);
      await dispatch.update({ status: 'failed', dispatchedAt: new Date(), error: msg });
      await failPendingMessagesForDispatch({
        campaign,
        dispatch,
        scheduledFor,
        error: msg,
      });
      if (campaign.recurringActive && campaign.recurringInterval) {
        const next = nextOccurrenceAfter(scheduledFor, campaign.recurringInterval, new Date());
        const recurrenceEnd = campaign.recurrenceEndAt
          ? new Date(campaign.recurrenceEndAt)
          : null;
        if (next && (!recurrenceEnd || next <= recurrenceEnd)) {
          await campaign.update({ schedule: next, status: 'pending' });
          await seedPendingMessagesForCampaign(campaign.id);
          continue;
        }
      }
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

  processDueCampaignsOnce().catch((err) => {
    console.error('Campaign scheduler initial tick error:', err);
  });

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
  resolveCampaignRecipients,
  seedPendingMessagesForCampaign,
  addInterval,
  nextOccurrenceAfter,
};
