const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Conversation extends Model {}

Conversation.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
  contactId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'contact_id' },
  customerPhone: { type: DataTypes.STRING(32), allowNull: false, field: 'customer_phone' },
  senderId: { type: DataTypes.STRING(20), allowNull: true, field: 'sender_id' },
  ownerUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'owner_user_id' },
  assignedToId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'assigned_to_id' },
  sourceCampaignId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'source_campaign_id' },
  status: {
    type: DataTypes.ENUM('open', 'pending', 'resolved', 'archived'),
    allowNull: false,
    defaultValue: 'open',
  },
  unreadCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'unread_count' },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_message_at' },
  lastReadAt: { type: DataTypes.DATE, allowNull: true, field: 'last_read_at' },
}, {
  sequelize,
  modelName: 'Conversation',
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['company_id', 'last_message_at'], name: 'conversation_company_activity_idx' },
    { fields: ['company_id', 'customer_phone'], name: 'conversation_company_phone_idx' },
    { fields: ['company_id', 'owner_user_id', 'customer_phone'], name: 'conversation_owner_phone_idx' },
  ],
});

module.exports = Conversation;
