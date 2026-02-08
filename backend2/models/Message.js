const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Message extends Model {}

Message.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'campaign_id',
  },
  recipientType: {
    type: DataTypes.ENUM('User', 'Contact'),
    allowNull: false,
    field: 'recipient_type',
  },
  recipientId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'recipient_id',
  },
  phoneNumber: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'phone_number',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  response: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at',
  },
}, {
  sequelize,
  modelName: 'Message',
  tableName: 'messages',
  timestamps: true,
  underscored: true,
});

module.exports = Message;