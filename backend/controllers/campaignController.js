const { Campaign, CampaignRecipient, CampaignDispatch, Group, Contact, User, Message, CompanyUser, sequelize } = require('../models');
const { Op } = require('sequelize');
const { seedPendingMessagesForCampaign } = require('../services/campaignSchedulerService');

const normalizeIds = (ids) => Array.isArray(ids)
  ? [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
  : [];

const canAccessCampaign = (req, campaign) => {
  const activeCompanyId = Number(req.companyContext?.companyId || 0) || null;
  if (activeCompanyId && campaign.companyId) {
    return Number(campaign.companyId) === activeCompanyId;
  }
  return req.user?.role === 'admin' || campaign.createdById === req.user?.id;
};

const canAccessGroup = async (req, group) => {
  const activeCompanyId = Number(req.companyContext?.companyId || 0) || null;
  if (activeCompanyId && group.companyId) {
    return Number(group.companyId) === activeCompanyId;
  }
  if (!activeCompanyId) {
    return req.user?.role === 'admin' || group.ownerId === req.user?.id;
  }
  return false;
};

const recipientsBelongToCompany = async ({ recipientType, recipientIds, companyId }) => {
  if (!recipientIds.length) return true;
  if (recipientType === 'Contact') {
    const count = await Contact.count({
      where: {
        id: { [Op.in]: recipientIds },
        ...(companyId ? { companyId } : {}),
      },
    });
    return count === recipientIds.length;
  }
  if (companyId) {
    const count = await CompanyUser.count({
      where: { companyId, userId: { [Op.in]: recipientIds } },
    });
    return count === recipientIds.length;
  }
  return User.count({ where: { id: { [Op.in]: recipientIds } } })
    .then((count) => count === recipientIds.length);
};

const parseCampaignTiming = ({ schedule, recurring = {} }) => {
  const scheduledAt = schedule ? new Date(schedule) : null;
  if (schedule && Number.isNaN(scheduledAt.getTime())) return { error: 'schedule must be a valid datetime' };
  const recurringActive = recurring?.active === true;
  const interval = recurringActive ? String(recurring?.interval || '') : '';
  if (recurringActive && !scheduledAt) return { error: 'Recurring campaigns require a schedule' };
  if (recurringActive && !['daily', 'weekly', 'monthly'].includes(interval)) {
    return { error: 'Recurring interval must be daily, weekly, or monthly' };
  }
  const recurrenceEndAt = recurring?.endAt ? new Date(recurring.endAt) : null;
  if (recurring?.endAt && Number.isNaN(recurrenceEndAt.getTime())) {
    return { error: 'Recurrence end must be a valid datetime' };
  }
  if (recurrenceEndAt && scheduledAt && recurrenceEndAt < scheduledAt) {
    return { error: 'Recurrence end must be after the first scheduled send' };
  }
  return { scheduledAt, recurringActive, interval: interval || null, recurrenceEndAt };
};

const createCampaign = async (req, res) => {
  try {
    const {
      name,
      message,
      type,
      recipients = [],
      group,
      schedule,
      recurring = {},
      recipientType
    } = req.body;

    if (!name || !message || !type || !recipientType) {
      return res.status(400).json({ message: 'Missing required fields: name, message, type, and recipientType are required' });
    }

    const allowedRecipientTypes = ['User', 'Contact'];
    if (!allowedRecipientTypes.includes(recipientType)) {
      return res.status(400).json({ message: `recipientType must be one of: ${allowedRecipientTypes.join(', ')}` });
    }

    if (!Array.isArray(recipients)) {
      return res.status(400).json({ message: 'recipients must be an array' });
    }

    const recipientIds = normalizeIds(recipients);
    const activeCompanyId = Number(req.companyContext?.companyId || 0) || null;
    const timing = parseCampaignTiming({ schedule, recurring });
    if (timing.error) return res.status(400).json({ message: timing.error });
    if (timing.scheduledAt && timing.scheduledAt <= new Date()) {
      return res.status(400).json({ message: 'schedule must be in the future' });
    }
    const canScheduleCampaign = (req.companyContext?.permissions || []).includes('campaign.schedule');
    if ((schedule || recurring?.active === true) && !canScheduleCampaign && req.user?.role !== 'admin') {
      return res.status(403).json({
        message: 'Campaign scheduling permission is required to schedule or repeat a campaign',
      });
    }

    let groupRecord = null;
    if (group) {
      groupRecord = await Group.findByPk(group, {
        include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id'] }],
      });
      if (!groupRecord) return res.status(404).json({ message: 'Group not found' });
      if (!(await canAccessGroup(req, groupRecord))) {
        return res.status(403).json({ message: 'Group does not belong to you' });
      }
      const memberCount = groupRecord.members?.length || 0;
      if (memberCount === 0 && recipientIds.length === 0) {
        return res.status(400).json({
          message:
            'This group has no members. Add contacts to the group or add individual recipients before creating the campaign.',
        });
      }
    }

    if (!(await recipientsBelongToCompany({ recipientType, recipientIds, companyId: activeCompanyId }))) {
      return res.status(400).json({ message: 'One or more recipients do not belong to this company' });
    }

    const tx = await sequelize.transaction();
    try {
      const campaign = await Campaign.create({
        name,
        message,
        type,
        recipientType,
        groupId: groupRecord ? groupRecord.id : null,
        schedule: timing.scheduledAt,
        recurringActive: timing.recurringActive,
        recurringInterval: timing.interval,
        recurrenceEndAt: timing.recurrenceEndAt,
        companyId: activeCompanyId,
        createdById: req.user?.id,
        status: 'pending',
      }, { transaction: tx });

      if (recipientIds.length > 0) {
        await CampaignRecipient.bulkCreate(
          recipientIds.map((id) => ({ campaignId: campaign.id, recipientType, recipientId: id })),
          { transaction: tx }
        );
      }

      await tx.commit();

      const created = await Campaign.findByPk(campaign.id, {
        include: [
          { model: CampaignRecipient, as: 'recipientLinks', attributes: ['id', 'recipientId', 'recipientType'] },
          { model: Group, as: 'group', attributes: ['id', 'name'] },
          {
            model: CampaignDispatch,
            as: 'dispatches',
            separate: true,
            limit: 10,
            order: [['scheduledFor', 'DESC']],
          },
        ],
      });

      if (schedule && new Date(schedule) > new Date()) {
        await seedPendingMessagesForCampaign(campaign.id);
      }

      res.status(201).json(created);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const getAllCampaigns = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 500);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim().toLowerCase();
    const sortBy = ['name', 'status', 'created_at', 'createdAt', 'schedule'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const activeCompanyId = Number(req.companyContext?.companyId || 0) || null;
    let ownerFilter;
    if (activeCompanyId) {
      const memberships = await CompanyUser.findAll({
        where: { companyId: activeCompanyId },
        attributes: ['userId'],
        raw: true,
      });
      const companyUserIds = memberships.map((membership) => membership.userId);
      ownerFilter = {
        [Op.or]: [
          { companyId: activeCompanyId },
          ...(companyUserIds.length
            ? [{ companyId: null, createdById: { [Op.in]: companyUserIds } }]
            : []),
        ],
      };
    } else {
      ownerFilter = req.user?.role === 'admin' ? {} : { createdById: req.user?.id };
    }
    const where = {
      ...ownerFilter,
      ...(status === 'scheduled'
        ? { status: 'pending', recurringActive: false, schedule: { [Op.gt]: new Date() } }
        : status === 'recurring'
          ? { recurringActive: true, status: { [Op.in]: ['pending', 'paused'] } }
          : status && status !== 'all'
            ? { status: status === 'sent' ? { [Op.in]: ['sent', 'partial'] } : status }
            : {}),
      ...(search
        ? {
            [Op.or]: [
              { name: { [ilike]: `%${search}%` } },
              { message: { [ilike]: `%${search}%` } },
              { status: { [ilike]: `%${search}%` } },
            ],
          }
        : {}),
    };

    // Use separate queries for hasMany associations so we avoid giant JOINs
    // (one row per recipient × campaign), which stalls MySQL and the Node event loop.
    const { rows, count } = await Campaign.findAndCountAll({
      where,
      order: [[sortBy, sortDir]],
      include: [
        {
          model: CampaignRecipient,
          as: 'recipientLinks',
          attributes: ['id', 'recipientId', 'recipientType'],
          separate: true,
        },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        {
          model: CampaignDispatch,
          as: 'dispatches',
          separate: true,
          limit: 10,
          order: [['scheduledFor', 'DESC']],
        },
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const campaignIds = rows.map((campaign) => campaign.id);
    const deliveryCountsByCampaign = new Map();
    if (campaignIds.length) {
      const deliveryRows = await Message.findAll({
        where: { campaignId: { [Op.in]: campaignIds } },
        attributes: [
          'campaignId',
          'status',
          'networkDeliveryStatus',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'count'],
        ],
        group: ['campaignId', 'status', 'networkDeliveryStatus'],
        raw: true,
      });
      for (const delivery of deliveryRows) {
        const campaignId = delivery.campaignId ?? delivery.campaign_id;
        const counts = deliveryCountsByCampaign.get(campaignId) || {
          queued: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
        };
        const amount = Number(delivery.count) || 0;
        if (delivery.status === 'pending') counts.queued += amount;
        if (delivery.status === 'sent') counts.sent += amount;
        if (delivery.status === 'failed') counts.failed += amount;
        if (/delivered|success/i.test(String(delivery.networkDeliveryStatus || ''))) {
          counts.delivered += amount;
        }
        deliveryCountsByCampaign.set(campaignId, counts);
      }
    }

    const data = rows.map((campaign) => ({
      ...campaign.toJSON(),
      deliveryCounts: deliveryCountsByCampaign.get(campaign.id) || {
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
      },
    }));

    res.json({
      data,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const updateCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await Campaign.findByPk(id, { include: [{ model: CampaignRecipient, as: 'recipientLinks' }] });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (!canAccessCampaign(req, campaign)) {
      return res.status(403).json({ message: 'You do not have permission to update this campaign' });
    }

    const { name, message, type, recipients, group, schedule, recurring, recipientType, status } = req.body;

    const changesSendingPlan = schedule !== undefined || recurring !== undefined || status !== undefined;
    const canScheduleCampaign = (req.companyContext?.permissions || []).includes('campaign.schedule');
    if (changesSendingPlan && !canScheduleCampaign && req.user?.role !== 'admin') {
      return res.status(403).json({
        message: 'Campaign scheduling permission is required to change scheduling or recurring status',
      });
    }

    const updates = {};
    if (name) updates.name = name;
    if (message) updates.message = message;
    if (type) updates.type = type;
    if (schedule !== undefined) {
      const nextSchedule = schedule ? new Date(schedule) : null;
      const scheduleChanged = nextSchedule &&
        (!campaign.schedule || Math.abs(nextSchedule.getTime() - new Date(campaign.schedule).getTime()) > 1000);
      if (scheduleChanged && nextSchedule <= new Date()) {
        return res.status(400).json({ message: 'schedule must be in the future' });
      }
      updates.schedule = schedule || null;
      // Scheduler only picks pending + schedule <= now; allow re-scheduling completed/failed runs.
      if (schedule && ['sent', 'failed'].includes(campaign.status)) {
        updates.status = 'pending';
      }
    }
    if (status) updates.status = status;
    if (recurring !== undefined) {
      const timing = parseCampaignTiming({
        schedule: schedule !== undefined ? schedule : campaign.schedule,
        recurring,
      });
      if (timing.error) return res.status(400).json({ message: timing.error });
      updates.recurringActive = timing.recurringActive;
      updates.recurringInterval = timing.interval;
      updates.recurrenceEndAt = timing.recurrenceEndAt;
    }
    if (recipientType) updates.recipientType = recipientType;

    const tx = await sequelize.transaction();
    try {
      if (group !== undefined) {
        if (group) {
          const groupRecord = await Group.findByPk(group);
          if (!groupRecord) {
            await tx.rollback();
            return res.status(404).json({ message: 'Group not found' });
          }
          if (!(await canAccessGroup(req, groupRecord))) {
            await tx.rollback();
            return res.status(403).json({ message: 'Group does not belong to this company' });
          }
          updates.groupId = groupRecord.id;
        } else {
          updates.groupId = null;
        }
      }

      await campaign.update(updates, { transaction: tx });

      if (recipients !== undefined) {
        if (!Array.isArray(recipients)) {
          await tx.rollback();
          return res.status(400).json({ message: 'recipients must be an array' });
        }
        const recipientIds = normalizeIds(recipients);
        if (updates.recipientType || campaign.recipientType) {
          const typeToUse = updates.recipientType || campaign.recipientType;
          if (recipientIds.length > 0) {
            const activeCompanyId = Number(req.companyContext?.companyId || 0) || null;
            const validRecipients = await recipientsBelongToCompany({
              recipientType: typeToUse,
              recipientIds,
              companyId: activeCompanyId,
            });
            if (!validRecipients) {
              await tx.rollback();
              return res.status(400).json({ message: 'One or more recipients not found for provided recipientType' });
            }
          }

          await CampaignRecipient.destroy({ where: { campaignId: campaign.id }, transaction: tx });
          if (recipientIds.length > 0) {
            await CampaignRecipient.bulkCreate(
              recipientIds.map((rid) => ({ campaignId: campaign.id, recipientId: rid, recipientType: typeToUse })),
              { transaction: tx }
            );
          }
        }
      }

      const reloadedForValidation = await Campaign.findByPk(campaign.id, {
        include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['id'] }],
        transaction: tx,
      });
      if (reloadedForValidation.groupId) {
        const g = await Group.findByPk(reloadedForValidation.groupId, {
          include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id'] }],
          transaction: tx,
        });
        const linkCount = reloadedForValidation.recipientLinks?.length || 0;
        if (!(g?.members?.length) && linkCount === 0) {
          await tx.rollback();
          return res.status(400).json({
            message:
              'This group has no members and the campaign has no direct recipients. Add group members or recipients.',
          });
        }
      }

      await tx.commit();

      const afterUpdate = await Campaign.findByPk(campaign.id, {
        include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['recipientId', 'recipientType'] }],
      });
      await Message.destroy({ where: { campaignId: campaign.id, status: 'pending' } });
      await CampaignDispatch.destroy({
        where: {
          campaignId: campaign.id,
          status: 'pending',
          dispatchedAt: null,
        },
      });
      if (afterUpdate?.schedule && new Date(afterUpdate.schedule) > new Date()) {
        await seedPendingMessagesForCampaign(campaign.id);
      }

      const updated = await Campaign.findByPk(campaign.id, {
        include: [
          { model: CampaignRecipient, as: 'recipientLinks', attributes: ['id', 'recipientId', 'recipientType'] },
          { model: Group, as: 'group', attributes: ['id', 'name'] },
          {
            model: CampaignDispatch,
            as: 'dispatches',
            separate: true,
            limit: 10,
            order: [['scheduledFor', 'DESC']],
          },
        ],
      });

      res.json(updated);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Failed to update campaign:', error);
    res.status(500).json({ message: 'Failed to update campaign' });
  }
};

const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (!canAccessCampaign(req, campaign)) {
      return res.status(403).json({ message: 'You do not have permission to delete this campaign' });
    }

    await Campaign.destroy({ where: { id } });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
};

const changeCampaignStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!canAccessCampaign(req, campaign)) {
      return res.status(403).json({ message: 'You do not have permission to update this campaign' });
    }

    const action = String(req.body?.action || '').trim().toLowerCase();
    const nextStatus = { pause: 'paused', resume: 'pending', cancel: 'cancelled' }[action];
    if (!nextStatus) {
      return res.status(400).json({ message: 'action must be pause, resume, or cancel' });
    }
    if (['sent', 'partial', 'failed', 'cancelled'].includes(campaign.status)) {
      return res.status(409).json({ message: 'Completed campaigns cannot be changed' });
    }
    if (action === 'pause' && (!campaign.recurringActive || campaign.status !== 'pending')) {
      return res.status(409).json({ message: 'Only active recurring campaigns can be paused' });
    }
    if (action === 'resume' && campaign.status !== 'paused') {
      return res.status(409).json({ message: 'Only paused campaigns can be resumed' });
    }

    await campaign.update({ status: nextStatus });
    if (nextStatus === 'cancelled') {
      await Message.destroy({ where: { campaignId: campaign.id, status: 'pending' } });
      await CampaignDispatch.destroy({
        where: {
          campaignId: campaign.id,
          status: 'pending',
          dispatchedAt: null,
        },
      });
    }
    return res.json({ message: `Campaign ${nextStatus}`, campaign });
  } catch (error) {
    console.error('Change campaign status error:', error);
    return res.status(500).json({ message: 'Failed to change campaign status' });
  }
};

const getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await Campaign.findByPk(id, {
      include: [
        { model: CampaignRecipient, as: 'recipientLinks', attributes: ['id', 'recipientId', 'recipientType'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'role'] },
        {
          model: CampaignDispatch,
          as: 'dispatches',
          separate: true,
          limit: 10,
          order: [['scheduledFor', 'DESC']],
        },
      ],
    });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (!canAccessCampaign(req, campaign)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const links = campaign.recipientLinks || [];
    const contactIds = links.filter((l) => l.recipientType === 'Contact').map((l) => l.recipientId);
    const userIds = links.filter((l) => l.recipientType === 'User').map((l) => l.recipientId);

    const [contacts, users] = await Promise.all([
      contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
      userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
    ]);

    const response = campaign.toJSON();
    response.recipientsResolved = {
      contacts,
      users,
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch campaign by id:', error);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
};


module.exports = { createCampaign, getAllCampaigns, getCampaignById, updateCampaign, deleteCampaign, changeCampaignStatus };
