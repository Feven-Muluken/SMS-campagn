const { Op } = require('sequelize');
const { Contact, Group, ContactLocation, sequelize } = require('../models');
const { normalizeToE164 } = require('../utils/phoneNormalize');

const sameUser = (a, b) => Number(a) === Number(b);

const contactInclude = [
  { model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] },
];

const normalizeTagsInput = (tags) => {
  if (tags === undefined) return undefined;
  if (tags === null) return [];
  const arr = Array.isArray(tags) ? tags : String(tags).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const cleaned = arr
    .map((t) => String(t).toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean);
  return [...new Set(cleaned)];
};

const parseLocationPayload = (location) => {
  if (!location || typeof location !== 'object') return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    locationName: location.locationName || null,
    source: location.source || 'manual',
    capturedAt: location.capturedAt ? new Date(location.capturedAt) : new Date(),
  };
};

const createContact = async (req, res) => {
  const { name, phoneNumber, groups, location, tags } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const normalizedPhone = normalizeToE164(phoneNumber);
  if (!normalizedPhone) {
    return res.status(400).json({
      message:
        'Invalid phone number. Use international format (e.g. +251911234567) or a valid national number for your DEFAULT_PHONE_REGION / DEFAULT_PHONE_COUNTRY_CODE.',
    });
  }

  try {
    const existing = await Contact.findOne({
      where: { phoneNumber: normalizedPhone },
      include: contactInclude,
    });
    if (existing) {
      const isOwner = sameUser(existing.createdById, req.user.id);
      const isAdmin = req.user?.role === 'admin';
      if (isOwner || isAdmin) {
        const populated =
          (await Contact.findByPk(existing.id, {
            include: [...contactInclude, { model: ContactLocation, as: 'location' }],
          })) || existing;
        return res.status(200).json(populated);
      }
      return res.status(409).json({
        message: 'This phone number is already registered to another user.',
      });
    }

    const tx = await sequelize.transaction();
    try {
      const tagList = normalizeTagsInput(tags) ?? [];
      const contact = await Contact.create({
        name: name || normalizedPhone,
        phoneNumber: normalizedPhone,
        createdById: req.user.id,
        tags: tagList,
      }, { transaction: tx });

      if (groups) {
        const groupIds = Array.isArray(groups) ? groups : [groups];
        const validGroups = await Group.findAll({ where: { id: groupIds } });
        if (validGroups.length !== groupIds.length) {
          await tx.rollback();
          return res.status(400).json({ message: 'One or more group ids are invalid' });
        }
        await contact.setGroups(validGroups, { transaction: tx });
      }

      const parsedLocation = parseLocationPayload(location);
      if (parsedLocation) {
        await ContactLocation.create(
          {
            contactId: contact.id,
            ...parsedLocation,
          },
          { transaction: tx }
        );
      }

      await tx.commit();

      const populatedContact = await Contact.findByPk(contact.id, {
        include: [
          { model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] },
          { model: ContactLocation, as: 'location' },
        ],
      });

      res.status(201).json(populatedContact);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create contact error:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const row = await Contact.findOne({
        where: { phoneNumber: normalizedPhone },
        include: contactInclude,
      });
      if (row) {
        if (sameUser(row.createdById, req.user.id) || req.user?.role === 'admin') {
          const populated =
            (await Contact.findByPk(row.id, {
              include: [...contactInclude, { model: ContactLocation, as: 'location' }],
            })) || row;
          return res.status(200).json(populated);
        }
        return res.status(409).json({
          message: 'This phone number is already registered to another user.',
        });
      }
      return res.status(409).json({
        message: 'This phone number is already registered to another user.',
      });
    }
    res.status(500).json({ message: 'Failed to create contact', error: error.message });
  }
};

const getAllContacts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 500);
    const search = (req.query.search || '').trim();
    const tagFilter = (req.query.tag || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const sortBy = ['name', 'phoneNumber', 'created_at', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const baseWhere = req.user?.role === 'admin' ? {} : { createdById: req.user.id };
    let where = search
      ? {
          ...baseWhere,
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
            { phoneNumber: { [ilike]: `%${search}%` } },
          ],
        }
      : baseWhere;

    if (tagFilter) {
      const tagCond = sequelize.literal(
        `JSON_SEARCH(COALESCE(tags, '[]'), 'one', ${sequelize.escape(tagFilter)}, NULL, '$[*]') IS NOT NULL`
      );
      where = { [Op.and]: [where, tagCond] };
    }

    const { rows, count } = await Contact.findAndCountAll({
      where,
      include: [
        { model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] },
        { model: ContactLocation, as: 'location' },
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
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

const updateContact = async (req, res) => {
  try {
    const { name, phoneNumber, groups, location, tags } = req.body;

    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] },
        { model: ContactLocation, as: 'location' },
      ],
    });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    if (req.user.role !== 'admin' && contact.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this contact' });
    }

    let nextPhone = contact.phoneNumber;
    if (phoneNumber !== undefined) {
      const trimmed = String(phoneNumber).trim();
      if (!trimmed) {
        return res.status(400).json({ message: 'Phone number cannot be empty' });
      }
      const n = normalizeToE164(phoneNumber);
      if (!n) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }
      nextPhone = n;
    }

    if (nextPhone && nextPhone !== contact.phoneNumber) {
      const existing = await Contact.findOne({
        where: { phoneNumber: nextPhone, id: { [Op.ne]: contact.id } },
      });
      if (existing) {
        if (req.user?.role !== 'admin' && !sameUser(existing.createdById, req.user.id)) {
          return res.status(409).json({
            message: 'This phone number is already registered to another user.',
          });
        }
        return res.status(409).json({
          message: 'This phone number is already in use by another contact.',
        });
      }
    }

    const tx = await sequelize.transaction();
    try {
      await contact.update({
        name: name ?? contact.name,
        phoneNumber: nextPhone,
        ...(tags !== undefined ? { tags: normalizeTagsInput(tags) ?? [] } : {}),
      }, { transaction: tx });

      if (groups !== undefined) {
        if (!groups) {
          await contact.setGroups([], { transaction: tx });
        } else {
          const groupIds = Array.isArray(groups) ? groups : [groups];
          const validGroups = await Group.findAll({ where: { id: groupIds } });
          if (validGroups.length !== groupIds.length) {
            await tx.rollback();
            return res.status(400).json({ message: 'One or more group ids are invalid' });
          }
          await contact.setGroups(validGroups, { transaction: tx });
        }
      }

      if (location !== undefined) {
        const parsedLocation = parseLocationPayload(location);
        if (!parsedLocation) {
          await ContactLocation.destroy({ where: { contactId: contact.id }, transaction: tx });
        } else {
          await ContactLocation.upsert(
            {
              contactId: contact.id,
              ...parsedLocation,
            },
            { transaction: tx }
          );
        }
      }

      await tx.commit();

      const updatedContact = await Contact.findByPk(contact.id, {
        include: [
          { model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] },
          { model: ContactLocation, as: 'location' },
        ]
      });

      res.json(updatedContact);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Update contact error:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        message: 'This phone number is already in use.',
      });
    }
    res.status(500).json({ message: 'Failed to update contact' });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    if (req.user.role !== 'admin' && contact.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this contact' });
    }

    await Contact.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Failed to delete contact' });
  }
};

module.exports = { createContact, getAllContacts, updateContact, deleteContact };