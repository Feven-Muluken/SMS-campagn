const { Group, Contact, Message, User, GroupMember, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendSMS } = require('../services/smsService');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1,14}$/.test(number);

const normalizePhoneNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const toArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeUuidOrIntId = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0) return value;
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return trimmed;

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return null;
};

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

const membersDictToInputMembers = (membersDict) => {
  if (!membersDict || typeof membersDict !== 'object' || Array.isArray(membersDict)) return [];

  const inputMembers = [];

  const contactValues = toArray(
    membersDict.contact ??
      membersDict.contacts ??
      membersDict.contactIds ??
      membersDict.contact_ids
  );
  for (const id of contactValues) inputMembers.push({ contactId: id });

  const userValues = toArray(
    membersDict.user ??
      membersDict.users ??
      membersDict.userIds ??
      membersDict.user_ids
  );
  for (const id of userValues) inputMembers.push({ userId: id });

  const phoneValues = toArray(
    membersDict.phoneNumber ??
      membersDict.phoneNumbers ??
      membersDict.phone_number ??
      membersDict.phone_numbers ??
      membersDict.phonenumber
  );
  for (const p of phoneValues) inputMembers.push({ phoneNumber: p });

  return inputMembers;
};

const resolveMembersToContacts = async ({ inputMembers, tx, createdById }) => {
  const invalid = [];
  const requestedContactIds = [];
  const requestedUserIds = [];
  const requestedPhones = [];

  for (const member of inputMembers) {
    const contactId = member?.contactId;
    const userId = member?.userId;
    const phoneNumber = normalizePhoneNumber(member?.phoneNumber ?? member?.phone_number);
    const name = member?.name;

    if (contactId !== undefined && contactId !== null && contactId !== '') {
      const parsedId = Number(contactId);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        invalid.push({ member, reason: 'Invalid contactId' });
      } else {
        requestedContactIds.push(parsedId);
      }
      continue;
    }

    if (userId !== undefined && userId !== null && userId !== '') {
      const normalizedUserId = normalizeUuidOrIntId(userId);
      if (!normalizedUserId) {
        invalid.push({ member, reason: 'Invalid userId' });
      } else {
        requestedUserIds.push(normalizedUserId);
      }
      continue;
    }

    if (phoneNumber) {
      if (!isValidPhoneNumber(phoneNumber)) {
        invalid.push({ member, reason: 'Invalid phone number format (must be E.164 like +251912345678)' });
      } else {
        requestedPhones.push({ phoneNumber, name });
      }
      continue;
    }

    invalid.push({ member, reason: 'Member must include contactId, userId, or phoneNumber' });
  }

  const contacts = [];

  if (requestedContactIds.length > 0) {
    const uniqueContactIds = [...new Set(requestedContactIds)];
    const found = await Contact.findAll({ where: { id: uniqueContactIds }, transaction: tx });
    const foundIds = new Set(found.map((c) => c.id));
    for (const id of uniqueContactIds) {
      if (!foundIds.has(id)) invalid.push({ member: { contactId: id }, reason: 'Contact not found' });
    }
    contacts.push(...found);
  }

  if (requestedUserIds.length > 0) {
    const uniqueUserIds = [...new Set(requestedUserIds)];
    const foundUsers = await User.findAll({ where: { id: uniqueUserIds }, transaction: tx });
    const foundUserIds = new Set(foundUsers.map((u) => u.id));
    for (const id of uniqueUserIds) {
      if (!foundUserIds.has(id)) invalid.push({ member: { userId: id }, reason: 'User not found' });
    }

    for (const user of foundUsers) {
      const phoneNumber = normalizePhoneNumber(user.phoneNumber ?? user.phone_number);
      if (!phoneNumber) {
        invalid.push({ member: { userId: user.id }, reason: 'User has no phoneNumber' });
        continue;
      }
      if (!isValidPhoneNumber(phoneNumber)) {
        invalid.push({ member: { userId: user.id, phoneNumber }, reason: 'User phoneNumber is not valid E.164' });
        continue;
      }

      const [contact] = await Contact.findOrCreate({
        where: { phoneNumber },
        defaults: {
          name: user.name || phoneNumber,
          phoneNumber,
          createdById,
        },
        transaction: tx,
      });
      contacts.push(contact);
    }
  }

  if (requestedPhones.length > 0) {
    const uniquePhones = new Map();
    for (const p of requestedPhones) {
      if (!uniquePhones.has(p.phoneNumber)) uniquePhones.set(p.phoneNumber, p);
    }

    for (const { phoneNumber, name } of uniquePhones.values()) {
      const [contact] = await Contact.findOrCreate({
        where: { phoneNumber },
        defaults: {
          name: name || phoneNumber,
          phoneNumber,
          createdById,
        },
        transaction: tx,
      });
      contacts.push(contact);
    }
  }

  const uniqueContactsById = new Map();
  for (const c of contacts) uniqueContactsById.set(c.id, c);
  const uniqueContacts = [...uniqueContactsById.values()];

  return { contacts: uniqueContacts, invalid };
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
  const { name, members } = req.body;
  try {
    if (!name) return res.status(400).json({ message: 'Group name required' });
    const existing = await Group.findOne({ where: { name, ownerId: req.user.id } });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exist' });
    }

    const tx = await sequelize.transaction();
    try {
      const group = await Group.create({ name, ownerId: req.user.id }, { transaction: tx });

      if (members && typeof members === 'object' && !Array.isArray(members)) {
        const inputMembers = membersDictToInputMembers(members);
        if (inputMembers.length > 0) {
          const resolved = await resolveMembersToContacts({ inputMembers, tx, createdById: req.user.id });
          if (resolved.invalid.length > 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'Invalid members', invalid: resolved.invalid });
          }
          if (resolved.contacts.length > 0) {
            await group.setMembers(resolved.contacts, { transaction: tx });
          }
        }
      } else {
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
    res.status(500).json({ message: 'Server error', error: error?.message || String(error) });
  }
};

const addContactToGroup = async (req, res) => {
  const groupId = req.params.groupId;
  const body = req.body || {};

  // Backwards-compatible: { name, phoneNumber } still works.
  const legacyPhone = normalizePhoneNumber(body.phoneNumber ?? body.phone_number);

  const inputMembers = [];
  if (body.members !== undefined) {
    if (Array.isArray(body.members)) {
      inputMembers.push(...body.members);
    } else if (body.members && typeof body.members === 'object') {
      inputMembers.push(...membersDictToInputMembers(body.members));
    } else {
      return res.status(400).json({ message: 'members must be an array or an object' });
    }
  } else {
    toArray(body.contactIds).forEach((id) => inputMembers.push({ contactId: id }));
    if (body.contactId !== undefined) inputMembers.push({ contactId: body.contactId });

    toArray(body.userIds).forEach((id) => inputMembers.push({ userId: id }));
    if (body.userId !== undefined) inputMembers.push({ userId: body.userId });

    toArray(body.phoneNumbers ?? body.phone_numbers).forEach((p) => inputMembers.push({ phoneNumber: p }));
    if (legacyPhone) inputMembers.push({ phoneNumber: legacyPhone, name: body.name });
  }

  if (inputMembers.length === 0) {
    return res.status(400).json({ message: 'Provide contactId/contactIds, userId/userIds, phoneNumber/phoneNumbers, or members' });
  }

  const tx = await sequelize.transaction();
  try {
    const group = await Group.findByPk(groupId, { transaction: tx });
    if (!group) {
      await tx.rollback();
      return res.status(404).json({ message: 'Group not found' });
    }

    const resolved = await resolveMembersToContacts({ inputMembers, tx, createdById: req.user.id });
    const invalid = resolved.invalid;
    const uniqueContacts = resolved.contacts;

    if (uniqueContacts.length === 0) {
      await tx.rollback();
      return res.status(400).json({ message: 'No valid members to add', invalid });
    }

    const contactIds = uniqueContacts.map((c) => c.id);
    const existingLinks = await GroupMember.findAll({
      where: { groupId: group.id, contactId: contactIds },
      transaction: tx,
      attributes: ['contactId'],
    });
    const alreadySet = new Set(existingLinks.map((l) => l.contactId));

    const toCreate = contactIds
      .filter((id) => !alreadySet.has(id))
      .map((contactId) => ({ groupId: group.id, contactId }));

    if (toCreate.length > 0) {
      await GroupMember.bulkCreate(toCreate, { transaction: tx });
    }

    await tx.commit();

    const addedMembers = uniqueContacts
      .filter((c) => !alreadySet.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, phoneNumber: c.phoneNumber }));
    const alreadyMembers = uniqueContacts
      .filter((c) => alreadySet.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, phoneNumber: c.phoneNumber }));

    return res.status(200).json({
      message: 'Members processed',
      groupId: group.id,
      addedCount: addedMembers.length,
      alreadyCount: alreadyMembers.length,
      invalidCount: invalid.length,
      addedMembers,
      alreadyMembers,
      invalid,
    });
  } catch (error) {
    await tx.rollback();
    console.error('add member error', error);
    return res.status(500).json({ message: 'Server error', error: error?.message || String(error) });
  }
};

const sendGroupSMS = async (req, res) => {
  try {
    const { content, senderId } = req.body;
    if (!content) return res.status(400).json({ message: 'Message content is required' });

    const normalizedSenderId = senderId === null || senderId === undefined ? null : String(senderId).trim();
    const effectiveSenderId = normalizedSenderId && normalizedSenderId.length ? normalizedSenderId : null;
    if (effectiveSenderId && !/^[a-zA-Z0-9]{1,11}$/.test(effectiveSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }

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
        const response = await sendSMS(member.phoneNumber, content, { senderId: effectiveSenderId });
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

    const group = await Group.findByPk(req.params.groupId, { 
      include: [{ 
        model: Contact, as: 'members', through: { 
          attributes: [] 
        } 
      }] 
    });
    if (!group) return res.status(404).json({ 
      message: 'Group not found' 
    });

    if (req.user.role !== 'admin' && group.ownerId !== req.user.id) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this group'
      });
    }

    const existing = await Group.findOne({
      where: { 
        name, 
        ownerId: req.user.id, 
        id: { [Op.ne]: group.id } 
      }
    });
    if (existing) {
      return res.status(400).json({ 
        message: 'Group name already exists' 
      });
    }

    const tx = await sequelize.transaction();
    try {
      await group.update({ name }, { transaction: tx });

      if (members !== undefined && members && typeof members === 'object' && !Array.isArray(members)) {
        const inputMembers = membersDictToInputMembers(members);

        // Empty object clears members.
        if (inputMembers.length === 0) {
          await group.setMembers([], { transaction: tx });
        } else {
          const resolved = await resolveMembersToContacts({ inputMembers, tx, createdById: req.user.id });
          if (resolved.invalid.length > 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'Invalid members', invalid: resolved.invalid });
          }
          if (resolved.contacts.length === 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'No valid members to set' });
          }
          await group.setMembers(resolved.contacts, { transaction: tx });
        }
      } else {
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
      }

      await tx.commit();

      const updatedGroup = await Group.findByPk(group.id, {
        include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] }],
      });

      const groupJson = updatedGroup?.toJSON ? updatedGroup.toJSON() : updatedGroup;
      const memberContacts = Array.isArray(groupJson?.members) ? groupJson.members : [];

      res.json({
        ...groupJson,
        memberContacts,
        members: memberContacts.map((c) => ({
          name: c?.name ?? null,
          contact: c,
        })),
      });
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