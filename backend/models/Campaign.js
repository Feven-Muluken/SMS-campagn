const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Campaign extends Model {}

Campaign.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('individual', 'group', 'broadcast/everyone'),
    allowNull: false,
  },
  recipientType: {
    type: DataTypes.ENUM('User', 'Contact'),
    allowNull: false,
    field: 'recipient_type',
  },
  schedule: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  recurringActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'recurring_active',
  },
  recurringInterval: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: true,
    field: 'recurring_interval',
  },
  recurrenceEndAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'recurrence_end_at',
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'partial', 'failed', 'paused', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  groupId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'group_id',
  },
  createdById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'created_by_id',
  },
  companyId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'company_id',
  },
}, {
  sequelize,
  modelName: 'Campaign',
  tableName: 'campaigns',
  timestamps: true,
  underscored: true,
});

module.exports = Campaign;
