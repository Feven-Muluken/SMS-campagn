const { Op } = require('sequelize');
const { Appointment, Contact, Message, sequelize } = require('../models');
const { sendSMS } = require('./smsService');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1,14}$/.test(number);

const getTimeZone = () => process.env.APPT_TIMEZONE || process.env.TZ || 'UTC';

const formatDateTime = (date) => {
  const timeZone = getTimeZone();
  const dt = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dt);
};

const renderTemplate = (template, ctx) => {
  const safe = (v) => (v === null || v === undefined ? '' : String(v));
  return String(template)
    .replaceAll('{businessName}', safe(ctx.businessName))
    .replaceAll('{customerName}', safe(ctx.customerName))
    .replaceAll('{serviceName}', safe(ctx.serviceName))
    .replaceAll('{dateTime}', safe(ctx.dateTime));
};

const templates = () => ({
  confirmation:
    process.env.APPT_CONFIRMATION_TEMPLATE ||
    'Your appointment with {businessName} is confirmed for {dateTime}.',
  reminder:
    process.env.APPT_REMINDER_TEMPLATE ||
    'Reminder: Your appointment with {businessName} is scheduled for {dateTime}.',
  cancellation:
    process.env.APPT_CANCELLATION_TEMPLATE ||
    'Your appointment with {businessName} on {dateTime} has been cancelled.',
  followup:
    process.env.APPT_FOLLOWUP_TEMPLATE ||
    'Thank you for choosing {businessName}. We hope to see you again!',
});

const createMessageLog = async ({ appointment, content, status, response, sentAt }) => {
  await Message.create({
    campaignId: null,
    recipientType: 'Contact',
    recipientId: appointment.contactId || null,
    phoneNumber: appointment.phoneNumber,
    content,
    status,
    response,
    sentAt: sentAt || null,
  });
};

const sendAppointmentSMS = async ({ appointment, type, senderId }) => {
  const map = templates();
  const template = map[type];
  if (!template) throw new Error(`Unknown appointment notification type: ${type}`);

  const ctx = {
    businessName: appointment.businessName,
    customerName: appointment.customerName,
    serviceName: appointment.serviceName,
    dateTime: formatDateTime(appointment.scheduledAt),
  };

  const content = renderTemplate(template, ctx).trim();

  if (!appointment.phoneNumber || !isValidPhoneNumber(appointment.phoneNumber)) {
    throw new Error('Appointment phoneNumber must be valid E.164 (e.g., +251912345678)');
  }

  const response = await sendSMS(appointment.phoneNumber, content, { senderId });
  await createMessageLog({ appointment, content, status: 'sent', response, sentAt: new Date() });

  return { content, response };
};

const markSentField = async ({ appointmentId, field, value, errorMessage }) => {
  const patch = { [field]: value };
  if (errorMessage !== undefined) patch.lastNotificationError = errorMessage;
  await Appointment.update(patch, { where: { id: appointmentId } });
};

const sendConfirmationIfNeeded = async (appointment) => {
  if (appointment.status !== 'booked') return;
  if (appointment.confirmationSentAt) return;
  try {
    await sendAppointmentSMS({ appointment, type: 'confirmation' });
    await markSentField({ appointmentId: appointment.id, field: 'confirmationSentAt', value: new Date(), errorMessage: null });
  } catch (err) {
    await createMessageLog({
      appointment,
      content: `[confirmation] ${err.message}`,
      status: 'failed',
      response: { error: err.message },
    });
    await markSentField({ appointmentId: appointment.id, field: 'confirmationSentAt', value: null, errorMessage: err.message });
  }
};

const sendCancellationIfNeeded = async (appointment) => {
  if (appointment.status !== 'cancelled') return;
  if (appointment.cancellationSentAt) return;
  try {
    await sendAppointmentSMS({ appointment, type: 'cancellation' });
    await markSentField({ appointmentId: appointment.id, field: 'cancellationSentAt', value: new Date(), errorMessage: null });
  } catch (err) {
    await createMessageLog({
      appointment,
      content: `[cancellation] ${err.message}`,
      status: 'failed',
      response: { error: err.message },
    });
    await markSentField({ appointmentId: appointment.id, field: 'cancellationSentAt', value: null, errorMessage: err.message });
  }
};

const getLeadMinutes = (appointment) => {
  const fromRow = Number(appointment.reminderMinutesBefore);
  if (Number.isFinite(fromRow) && fromRow >= 0) return fromRow;
  const fromEnv = Number(process.env.APPT_REMINDER_MINUTES_BEFORE);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 60;
};

const getFollowUpMinutes = (appointment) => {
  const fromRow = Number(appointment.followUpMinutesAfter);
  if (Number.isFinite(fromRow) && fromRow >= 0) return fromRow;
  const fromEnv = Number(process.env.APPT_FOLLOWUP_MINUTES_AFTER);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 120;
};

const getGraceMinutes = () => {
  const fromEnv = Number(process.env.APPT_NOTIFICATION_GRACE_MINUTES);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 15;
};

const processDueNotificationsOnce = async () => {
  const now = new Date();
  const graceMinutes = getGraceMinutes();

  // Reminders: send around (scheduledAt - lead)
  // We look for appointments whose "lead moment" is within +/- grace window.
  // leadMoment = scheduledAt - leadMinutes
  // due when: leadMoment between now - grace and now + grace

  const candidates = await Appointment.findAll({
    where: {
      status: { [Op.in]: ['booked', 'completed'] },
      phoneNumber: { [Op.ne]: null },
      scheduledAt: { [Op.ne]: null },
      [Op.or]: [
        { reminderSentAt: { [Op.is]: null } },
        { followUpSentAt: { [Op.is]: null } },
      ],
    },
    limit: 200,
    order: [['scheduledAt', 'ASC']],
  });

  for (const appointment of candidates) {
    // Reminder
    if (appointment.status === 'booked' && !appointment.reminderSentAt) {
      const leadMinutes = getLeadMinutes(appointment);
      const leadMoment = new Date(new Date(appointment.scheduledAt).getTime() - leadMinutes * 60 * 1000);
      const min = new Date(now.getTime() - graceMinutes * 60 * 1000);
      const max = new Date(now.getTime() + graceMinutes * 60 * 1000);

      if (leadMoment >= min && leadMoment <= max) {
        try {
          await sendAppointmentSMS({ appointment, type: 'reminder' });
          await markSentField({ appointmentId: appointment.id, field: 'reminderSentAt', value: new Date(), errorMessage: null });
        } catch (err) {
          await createMessageLog({
            appointment,
            content: `[reminder] ${err.message}`,
            status: 'failed',
            response: { error: err.message },
          });
          await markSentField({ appointmentId: appointment.id, field: 'reminderSentAt', value: null, errorMessage: err.message });
        }
      }
    }

    // Follow-up (send after scheduledAt + followUpMinutes) only once.
    if (appointment.status === 'completed' && !appointment.followUpSentAt) {
      const followUpMinutes = getFollowUpMinutes(appointment);
      const followUpMoment = new Date(new Date(appointment.scheduledAt).getTime() + followUpMinutes * 60 * 1000);
      const min = new Date(now.getTime() - graceMinutes * 60 * 1000);
      const max = new Date(now.getTime() + graceMinutes * 60 * 1000);

      if (followUpMoment >= min && followUpMoment <= max) {
        try {
          await sendAppointmentSMS({ appointment, type: 'followup' });
          await markSentField({ appointmentId: appointment.id, field: 'followUpSentAt', value: new Date(), errorMessage: null });
        } catch (err) {
          await createMessageLog({
            appointment,
            content: `[followup] ${err.message}`,
            status: 'failed',
            response: { error: err.message },
          });
          await markSentField({ appointmentId: appointment.id, field: 'followUpSentAt', value: null, errorMessage: err.message });
        }
      }
    }
  }
};

const startAppointmentScheduler = () => {
  const enabled = (process.env.APPT_SCHEDULER_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Appointment scheduler disabled (APPT_SCHEDULER_ENABLED=false)');
    return;
  }

  const intervalMs = (() => {
    const fromEnv = Number(process.env.APPT_SCHEDULER_INTERVAL_MS);
    return Number.isFinite(fromEnv) && fromEnv >= 1000 ? fromEnv : 60_000;
  })();

  console.log(`Appointment scheduler started (interval=${intervalMs}ms, tz=${getTimeZone()})`);

  setInterval(async () => {
    try {
      await processDueNotificationsOnce();
    } catch (err) {
      console.error('Appointment scheduler tick error:', err);
    }
  }, intervalMs);
};

module.exports = {
  sendAppointmentSMS,
  sendConfirmationIfNeeded,
  sendCancellationIfNeeded,
  startAppointmentScheduler,
};
