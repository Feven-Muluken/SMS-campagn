const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class InternalConversation extends Model {}

InternalConversation.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  // companies.id is a signed INT in existing installations, so this foreign
  // key must use the identical signedness for MySQL to accept the constraint.
  companyId: { type: DataTypes.INTEGER, allowNull: true, field: 'company_id' },
  createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'created_by_id' },
  recipientUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'recipient_user_id' },
  subject: { type: DataTypes.STRING(160), allowNull: false, defaultValue: 'Support' },
  status: { type: DataTypes.ENUM('open', 'resolved', 'archived'), allowNull: false, defaultValue: 'open' },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_message_at' },
}, {
  sequelize,
  modelName: 'InternalConversation',
  tableName: 'internal_conversations',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['company_id', 'last_message_at'], name: 'internal_conversation_company_activity_idx' }],
});

module.exports = InternalConversation;
