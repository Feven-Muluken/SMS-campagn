const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Appointment extends Model {}

Appointment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    businessName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'business_name',
    },
    serviceName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'service_name',
    },
    customerName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'customer_name',
    },
    phoneNumber: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'phone_number',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scheduled_at',
    },
    status: {
      type: DataTypes.ENUM('booked', 'cancelled', 'completed', 'no_show'),
      allowNull: false,
      defaultValue: 'booked',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contactId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'contact_id',
    },
    createdById: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'created_by_id',
    },
    reminderMinutesBefore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reminder_minutes_before',
    },
    followUpMinutesAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'followup_minutes_after',
    },
    confirmationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmation_sent_at',
    },
    reminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reminder_sent_at',
    },
    cancellationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancellation_sent_at',
    },
    followUpSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'followup_sent_at',
    },
    lastNotificationError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_notification_error',
    },
  },
  {
    sequelize,
    modelName: 'Appointment',
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Appointment;
