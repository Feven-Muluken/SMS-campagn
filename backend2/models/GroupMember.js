const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class GroupMember extends Model {}

GroupMember.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'group_id',
  },
  contactId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'contact_id',
  },
}, {
  sequelize,
  modelName: 'GroupMember',
  tableName: 'group_members',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['group_id', 'contact_id'],
      name: 'idx_group_member_unique',
    }
  ]
});

module.exports = GroupMember;
