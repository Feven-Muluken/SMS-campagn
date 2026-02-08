const { Campaign, CampaignRecipient, Group, Contact, User, sequelize } = require('../models');
const { Op } = require('sequelize');

const normalizeIds = (ids) => Array.isArray(ids) ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];

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

    let groupRecord = null;
    if (group) {
      groupRecord = await Group.findByPk(group);
      if (!groupRecord) return res.status(404).json({ message: 'Group not found' });
      if (req.user?.role !== 'admin' && groupRecord.ownerId !== req.user?.id) {
        return res.status(403).json({ message: 'Group does not belong to you' });
      }
    }

    if (recipientIds.length > 0) {
      if (recipientType === 'Contact') {
        const found = await Contact.findAll({ where: { id: recipientIds }, attributes: ['id'] });
        if (found.length !== recipientIds.length) return res.status(400).json({ message: 'One or more recipients not found (Contact)' });
      } else {
        const foundUsers = await User.findAll({ where: { id: recipientIds }, attributes: ['id'] });
        if (foundUsers.length !== recipientIds.length) return res.status(400).json({ message: 'One or more recipients not found (User)' });
      }
    }

    const tx = await sequelize.transaction();
    try {
      const campaign = await Campaign.create({
        name,
        message,
        type,
        recipientType,
        groupId: groupRecord ? groupRecord.id : null,
        schedule: schedule || null,
        recurringActive: !!recurring?.active,
        recurringInterval: recurring?.interval || null,
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
        ],
      });

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
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const sortBy = ['name', 'status', 'created_at', 'createdAt', 'schedule'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const ownerFilter = req.user?.role === 'admin' ? {} : { createdById: req.user?.id };
    const where = {
      ...ownerFilter,
      ...(status ? { status } : {}),
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

    const { rows, count } = await Campaign.findAndCountAll({
      where,
      order: [[sortBy, sortDir]],
      include: [
        { model: CampaignRecipient, as: 'recipientLinks', attributes: ['id', 'recipientId', 'recipientType'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
      ],
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
    console.error('Failed to fetch campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const updateCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await Campaign.findByPk(id, { include: [{ model: CampaignRecipient, as: 'recipientLinks' }] });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (req.user?.role !== 'admin' && campaign.createdById !== req.user?.id) {
      return res.status(403).json({ message: 'You do not have permission to update this campaign' });
    }

    const { name, message, type, recipients, group, schedule, recurring, recipientType, status } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (message) updates.message = message;
    if (type) updates.type = type;
    if (schedule !== undefined) updates.schedule = schedule || null;
    if (status) updates.status = status;
    if (recurring) {
      updates.recurringActive = !!recurring?.active;
      updates.recurringInterval = recurring?.interval || null;
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
            const model = typeToUse === 'Contact' ? Contact : User;
            const found = await model.findAll({ where: { id: recipientIds }, attributes: ['id'] });
            if (found.length !== recipientIds.length) {
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

      await tx.commit();

      const updated = await Campaign.findByPk(campaign.id, {
        include: [
          { model: CampaignRecipient, as: 'recipientLinks', attributes: ['id', 'recipientId', 'recipientType'] },
          { model: Group, as: 'group', attributes: ['id', 'name'] },
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

    if (req.user?.role !== 'admin' && campaign.createdById !== req.user?.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this campaign' });
    }

    await Campaign.destroy({ where: { id } });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    res.status(500).json({ message: 'Failed to delete campaign' });
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
      ],
    });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (req.user?.role !== 'admin' && campaign.createdById !== req.user?.id) {
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


module.exports = { createCampaign, getAllCampaigns, getCampaignById, updateCampaign, deleteCampaign };