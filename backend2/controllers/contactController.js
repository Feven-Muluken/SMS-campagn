const { Op } = require('sequelize');
const { Contact, Group, sequelize } = require('../models');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1,14}$/.test(number);

const createContact = async (req, res) => {
  const { name, phoneNumber, groups } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid phone number format. Must be in format: +[country code][number] (e.g., +251912345678)' });
  }

  try {
    const existing = await Contact.findOne({ where: { phoneNumber }, include: [{ model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] }] });
    if (existing) {
      return res.status(200).json(existing);
    }

    const tx = await sequelize.transaction();
    try {
      const contact = await Contact.create({
        name: name || phoneNumber,
        phoneNumber,
        createdById: req.user.id,
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

      await tx.commit();

      const populatedContact = await Contact.findByPk(contact.id, {
        include: [{ model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] }],
      });

      res.status(201).json(populatedContact);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ message: 'Failed to create contact', error: error.message });
  }
};

const getAllContacts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const sortBy = ['name', 'phoneNumber', 'created_at', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const baseWhere = req.user?.role === 'admin' ? {} : { createdById: req.user.id };
    const where = search
      ? {
          ...baseWhere,
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
            { phoneNumber: { [ilike]: `%${search}%` } },
          ],
        }
      : baseWhere;

    const { rows, count } = await Contact.findAndCountAll({
      where,
      include: [{ model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] }],
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
    const { name, phoneNumber, groups } = req.body;

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const contact = await Contact.findByPk(req.params.id, { include: [{ model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] }] });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    if (req.user.role !== 'admin' && contact.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this contact' });
    }

    if (phoneNumber && phoneNumber !== contact.phoneNumber) {
      const existing = await Contact.findOne({ where: { phoneNumber, id: { [Op.ne]: contact.id } } });
      if (existing) return res.status(400).json({ message: 'Phone number already exists' });
    }

    const tx = await sequelize.transaction();
    try {
      await contact.update({
        name: name ?? contact.name,
        phoneNumber: phoneNumber ?? contact.phoneNumber,
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

      await tx.commit();

      const updatedContact = await Contact.findByPk(contact.id, {
        include: [{ model: Group, as: 'groups', through: { attributes: [] }, attributes: ['id', 'name'] }]
      });

      res.json(updatedContact);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Update contact error:', error);
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