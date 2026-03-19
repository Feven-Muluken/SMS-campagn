const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ContactLocation extends Model {}

ContactLocation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    contactId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      field: 'contact_id',
    },
    locationName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'location_name',
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'manual',
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'captured_at',
    },
  },
  {
    sequelize,
    modelName: 'ContactLocation',
    tableName: 'contact_locations',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ContactLocation;