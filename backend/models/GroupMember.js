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
  usesrId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'user_id',
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
      fields: ['group_id', 'contact_id', 'user_id'],
      name: 'idx_group_member_unique',
    }
  ]
});

module.exports = GroupMember;

// many-to-many relationship between Group and Contact through GroupMember to add contact/phone number and users to a group. 
// This allows us to have a group with multiple contacts and users, 
// and also to track which user added which contact to the group.
// {
//   "name": "kalab",
//   "members": {
//     "contact": [1, 2],
//     "user": [5, 8],
//     "phoneNumber": "+251911111111"
//   }
// }