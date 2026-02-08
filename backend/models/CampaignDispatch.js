const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CampaignDispatch extends Model {}

CampaignDispatch.init(
  {
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
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scheduled_for',
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    dispatchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dispatched_at',
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CampaignDispatch',
    tableName: 'campaign_dispatches',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['campaign_id', 'scheduled_for'],
        name: 'idx_campaign_dispatch_unique',
      },
    ],
  }
);

module.exports = CampaignDispatch;
