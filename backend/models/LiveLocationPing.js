const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class LiveLocationPing extends Model {}

LiveLocationPing.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'phone_number',
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    accuracyMeters: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'accuracy_meters',
    },
    contactId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'contact_id',
    },
  },
  {
    sequelize,
    modelName: 'LiveLocationPing',
    tableName: 'live_location_pings',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['phone_number'] }, { fields: ['created_at'] }],
  }
);

module.exports = LiveLocationPing;
