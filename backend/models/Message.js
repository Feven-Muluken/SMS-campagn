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
  companyId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'company_id',
  },
  conversationId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'conversation_id',
  },
  sentById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'sent_by_id',
  },
  groupId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'group_id',
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
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed'),
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
  providerMessageId: {
    type: DataTypes.STRING(96),
    allowNull: true,
    field: 'provider_message_id',
  },
  provider: {
    type: DataTypes.ENUM('africastalking', 'mobilesms_io'),
    allowNull: true,
    defaultValue: 'africastalking',
    comment: 'SMS provider used to send this message',
  },
  networkDeliveryStatus: {
    type: DataTypes.STRING(32),
    allowNull: true,
    field: 'network_delivery_status',
  },
  deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  failedAt: { type: DataTypes.DATE, allowNull: true, field: 'failed_at' },
  channel: {
    type: DataTypes.STRING(24),
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Message',
  tableName: 'messages',
  timestamps: true,
  underscored: true,
});

module.exports = Message;
