const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CampaignRecipient extends Model {}

CampaignRecipient.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'campaign_id',
  },
  recipientType: {
    type: DataTypes.ENUM('User', 'Contact'),
    allowNull: false,
    field: 'recipient_type',
  },
  recipientId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'recipient_id',
  },
}, {
  sequelize,
  modelName: 'CampaignRecipient',
  tableName: 'campaign_recipients',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_campaign_recipient',
      fields: ['campaign_id', 'recipient_type', 'recipient_id']
    }
  ]
});

module.exports = CampaignRecipient;
