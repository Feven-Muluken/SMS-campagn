const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class InternalMessage extends Model {}

InternalMessage.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  conversationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'conversation_id' },
  senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'sender_id' },
  content: { type: DataTypes.TEXT, allowNull: false },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
}, {
  sequelize,
  modelName: 'InternalMessage',
  tableName: 'internal_messages',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['conversation_id', 'created_at'], name: 'internal_message_thread_time_idx' }],
});

module.exports = InternalMessage;
