const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Group extends Model {}

Group.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'owner_id',
  },
}, {
  sequelize,
  modelName: 'Group',
  tableName: 'groups',
  timestamps: true,
  underscored: true,
});

module.exports = Group;