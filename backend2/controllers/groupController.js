const { Group, Contact, Message, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendSMS } = require('../services/smsService');

const normalizeMemberIds = (members) => {
  if (members === undefined) return { ids: undefined };

  // Be forgiving: some clients send members as a single value or a string.
  // Supported:
  // - [1,2]
  // - "[1,2]" (JSON string)
  // - "1,2" (comma-separated)
  // - 1 / "1" (single)
  let normalizedMembers = members;
  if (!Array.isArray(normalizedMembers)) {
    if (typeof normalizedMembers === 'string') {
      const trimmed = normalizedMembers.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          normalizedMembers = parsed;
        } catch {
          // fall through to comma/single handling
        }
      }
      if (!Array.isArray(normalizedMembers)) {
        normalizedMembers = trimmed.includes(',')
          ? trimmed.split(',').map((s) => s.trim()).filter(Boolean)
          : [trimmed];
      }
    } else {
      normalizedMembers = [normalizedMembers];
    }
  }

  if (!Array.isArray(normalizedMembers)) return { error: 'Members must be an array' };

  const ids = [];
  const invalid = [];

  for (const item of normalizedMembers) {
    let rawId = item;
    if (item && typeof item === 'object') {
      rawId = item.contactId ?? item.contact_id ?? item.id;
    }

    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      invalid.push(item);
      continue;
    }
    ids.push(parsed);
  }

  if (invalid.length > 0) {
    return { error: 'Members must be an array of positive integer contact IDs', invalid };
  }

  return { ids: [...new Set(ids)] };
};

const getAllGroups = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const sortBy = ['name', 'created_at', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const where = search
      ? {
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
          ],
        }
      : {};

    const { rows, count } = await Group.findAndCountAll({
      where,
      include: [
        { model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] },
        { association: 'owner', attributes: ['id', 'name', 'email'] },
      ],
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
    console.error('Group list error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createGroup = async (req, res) => {
  const body = req.body || {};
  const { name, members } = body;
  try {
    if (!name) return res.status(400).json({ message: 'Group name required' });
    const existing = await Group.findOne({ where: { name, ownerId: req.user.id } });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exist' });
    }

    const tx = await sequelize.transaction();
    try {
      const group = await Group.create({ name, ownerId: req.user.id }, { transaction: tx });

      const normalized = normalizeMemberIds(members);
      if (normalized.error) {
        await tx.rollback();
        return res.status(400).json({ message: normalized.error, invalid: normalized.invalid });
      }

      const memberIds = normalized.ids;
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        const validContacts = await Contact.findAll({ where: { id: memberIds }, transaction: tx });
        const foundIds = new Set(validContacts.map((c) => c.id));
        const missing = memberIds.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
          await tx.rollback();
          return res.status(400).json({ message: 'One or more contact IDs are invalid', missing });
        }
        await group.setMembers(validContacts, { transaction: tx });
      }

      await tx.commit();

      const populatedGroup = await Group.findByPk(group.id, {
        include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] }],
      });

      res.status(201).json(populatedGroup);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addContactToGroup = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const tx = await sequelize.transaction();
    try {
      const contact = await Contact.create({ name, phoneNumber, createdById: req.user.id }, { transaction: tx });
      await group.addMember(contact, { transaction: tx });
      await tx.commit();
      res.status(201).json(contact);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('add member error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendGroupSMS = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Message content is required' });

    const group = await Group.findByPk(req.params.groupId, {
      include: [{ model: Contact, as: 'members', attributes: ['id', 'phoneNumber', 'name'] }],
    });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const members = group.members || [];
    if (members.length === 0) {
      return res.status(400).json({ message: 'Group has no members' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const member of members) {
      if (!member.phoneNumber) {
        failCount += 1;
        continue;
      }
      try {
        const response = await sendSMS(member.phoneNumber, content);
        await Message.create({
          campaignId: null,
          recipientType: 'Contact',
          recipientId: member.id,
          phoneNumber: member.phoneNumber,
          content,
          status: 'sent',
          response,
          sentAt: new Date(),
        });
        successCount += 1;
      } catch (error) {
        await Message.create({
          campaignId: null,
          recipientType: 'Contact',
          recipientId: member.id,
          phoneNumber: member.phoneNumber,
          content,
          status: 'failed',
          response: { error: error.message },
        });
        failCount += 1;
      }
    }

    res.json({ message: 'Group SMS dispatched', successCount, failCount, total: members.length });
  } catch (error) {
    console.error('sending group SMS error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateGroup = async (req, res) => {
  const body = req.body || {};
  const { name, members } = body;
  try {
    if (!name) return res.status(400).json({ message: 'Group name required' });

    const group = await Group.findByPk(req.params.groupId, { include: [{ model: Contact, as: 'members', through: { attributes: [] } }] });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (req.user.role !== 'admin' && group.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this group' });
    }

    const existing = await Group.findOne({
      where: { name, ownerId: req.user.id, id: { [Op.ne]: group.id } }
    });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    const tx = await sequelize.transaction();
    try {
      await group.update({ name }, { transaction: tx });

      const normalized = normalizeMemberIds(members);
      if (normalized.error) {
        await tx.rollback();
        return res.status(400).json({ message: normalized.error, invalid: normalized.invalid });
      }

      const memberIds = normalized.ids;
      if (memberIds !== undefined) {
        if (memberIds.length > 0) {
          const validContacts = await Contact.findAll({ where: { id: memberIds }, transaction: tx });
          const foundIds = new Set(validContacts.map((c) => c.id));
          const missing = memberIds.filter((id) => !foundIds.has(id));
          if (missing.length > 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'One or more contact IDs are invalid', missing });
          }
          await group.setMembers(validContacts, { transaction: tx });
        } else {
          await group.setMembers([], { transaction: tx });
        }
      }

      await tx.commit();

      const updatedGroup = await Group.findByPk(group.id, {
        include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] }],
      });

      res.json(updatedGroup);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error', error: error?.message || String(error) });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (req.user.role !== 'admin' && group.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this group' });
    }

    await Group.destroy({ where: { id: req.params.groupId } });
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { getAllGroups, createGroup, addContactToGroup, sendGroupSMS, updateGroup, deleteGroup };