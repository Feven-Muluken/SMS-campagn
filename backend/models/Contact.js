const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Contact extends Model {}

Contact.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  phoneNumber: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
  },
  createdById: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'created_by_id',
  },
  /** JSON array of segment tags, e.g. ["vip","retail"] */
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
}, {
  sequelize,
  modelName: 'Contact',
  tableName: 'contacts',
  timestamps: true,
  underscored: true,
});

module.exports = Contact;