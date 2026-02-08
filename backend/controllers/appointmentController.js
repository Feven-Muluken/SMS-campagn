const { Op } = require('sequelize');
const { Appointment, Contact, sequelize } = require('../models');
const {
  sendConfirmationIfNeeded,
  sendCancellationIfNeeded,
} = require('../services/appointmentNotificationService');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1,14}$/.test(number);

const parseDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  // invalid date check
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const getAllAppointments = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const sortBy = ['scheduled_at', 'scheduledAt', 'created_at', 'createdAt', 'status', 'business_name', 'businessName'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'scheduled_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;

    const baseWhere = req.user?.role === 'admin' ? {} : { createdById: req.user.id };

    const where = {
      ...baseWhere,
      ...(status ? { status } : {}),
      ...(search
        ? {
            [Op.or]: [
              { businessName: { [ilike]: `%${search}%` } },
              { customerName: { [ilike]: `%${search}%` } },
              { phoneNumber: { [ilike]: `%${search}%` } },
            ],
          }
        : {}),
    };

    const { rows, count } = await Appointment.findAndCountAll({
      where,
      include: [{ model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber'] }],
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
    console.error('Appointment list error:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [{ model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber'] }],
    });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (req.user.role !== 'admin' && appointment.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to view this appointment' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Failed to fetch appointment' });
  }
};

const createAppointment = async (req, res) => {
  const body = req.body || {};
  const {
    businessName,
    serviceName,
    customerName,
    phoneNumber,
    scheduledAt,
    notes,
    contactId,
    reminderMinutesBefore,
    followUpMinutesAfter,
    sendConfirmation,
  } = body;

  if (!businessName) return res.status(400).json({ message: 'businessName is required' });

  const when = parseDate(scheduledAt);
  if (!when) return res.status(400).json({ message: 'scheduledAt must be a valid datetime' });

  const tx = await sequelize.transaction();
  try {
    let resolvedPhone = phoneNumber;
    let resolvedCustomerName = customerName;
    let resolvedContactId = contactId ?? null;

    if (resolvedContactId) {
      const contact = await Contact.findByPk(resolvedContactId, { transaction: tx });
      if (!contact) {
        await tx.rollback();
        return res.status(400).json({ message: 'contactId is invalid' });
      }
      resolvedPhone = contact.phoneNumber;
      resolvedCustomerName = resolvedCustomerName || contact.name;
    }

    if (!resolvedPhone) {
      await tx.rollback();
      return res.status(400).json({ message: 'phoneNumber is required (or provide contactId)' });
    }

    if (!isValidPhoneNumber(resolvedPhone)) {
      await tx.rollback();
      return res.status(400).json({ message: 'Invalid phoneNumber format. Must be E.164 like +251912345678' });
    }

    const appointment = await Appointment.create(
      {
        businessName,
        serviceName: serviceName || null,
        customerName: resolvedCustomerName || null,
        phoneNumber: resolvedPhone,
        scheduledAt: when,
        status: 'booked',
        notes: notes || null,
        contactId: resolvedContactId,
        createdById: req.user.id,
        reminderMinutesBefore: reminderMinutesBefore ?? null,
        followUpMinutesAfter: followUpMinutesAfter ?? null,
      },
      { transaction: tx }
    );

    await tx.commit();

    // Send confirmation by default (can be disabled per request)
    if (sendConfirmation !== false) {
      await sendConfirmationIfNeeded(appointment);
    }

    const populated = await Appointment.findByPk(appointment.id, {
      include: [{ model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber'] }],
    });

    res.status(201).json(populated);
  } catch (error) {
    await tx.rollback();
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Failed to create appointment', error: error?.message || String(error) });
  }
};

const updateAppointment = async (req, res) => {
  const body = req.body || {};
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (req.user.role !== 'admin' && appointment.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this appointment' });
    }

    const nextScheduledAt = body.scheduledAt !== undefined ? parseDate(body.scheduledAt) : appointment.scheduledAt;
    if (body.scheduledAt !== undefined && !nextScheduledAt) {
      return res.status(400).json({ message: 'scheduledAt must be a valid datetime' });
    }

    const nextPhone = body.phoneNumber !== undefined ? body.phoneNumber : appointment.phoneNumber;
    if (body.phoneNumber !== undefined && !isValidPhoneNumber(nextPhone)) {
      return res.status(400).json({ message: 'Invalid phoneNumber format. Must be E.164 like +251912345678' });
    }

    const prevScheduledAt = appointment.scheduledAt;
    const prevStatus = appointment.status;

    const tx = await sequelize.transaction();
    try {
      await appointment.update(
        {
          businessName: body.businessName ?? appointment.businessName,
          serviceName: body.serviceName ?? appointment.serviceName,
          customerName: body.customerName ?? appointment.customerName,
          phoneNumber: nextPhone,
          scheduledAt: nextScheduledAt,
          notes: body.notes ?? appointment.notes,
          status: body.status ?? appointment.status,
          reminderMinutesBefore: body.reminderMinutesBefore ?? appointment.reminderMinutesBefore,
          followUpMinutesAfter: body.followUpMinutesAfter ?? appointment.followUpMinutesAfter,
        },
        { transaction: tx }
      );

      // If time changes, allow re-reminding (optional but usually desired)
      if (body.scheduledAt !== undefined && prevScheduledAt?.getTime() !== nextScheduledAt?.getTime()) {
        await appointment.update({ reminderSentAt: null }, { transaction: tx });
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    // Notifications on status change
    if (prevStatus !== appointment.status) {
      if (appointment.status === 'cancelled') {
        await sendCancellationIfNeeded(appointment);
      }
      if (appointment.status === 'booked') {
        await sendConfirmationIfNeeded(appointment);
      }
    }

    const populated = await Appointment.findByPk(appointment.id, {
      include: [{ model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber'] }],
    });

    res.json(populated);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Failed to update appointment', error: error?.message || String(error) });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (req.user.role !== 'admin' && appointment.createdById !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to cancel this appointment' });
    }

    await appointment.update({ status: 'cancelled' });
    await sendCancellationIfNeeded(appointment);

    res.json({ message: 'Appointment cancelled', appointment });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
};
