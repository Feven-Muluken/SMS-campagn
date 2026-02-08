const { sequelize } = require('../config/db');
const User = require('./User');
const Contact = require('./Contact');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Campaign = require('./Campaign');
const CampaignRecipient = require('./CampaignRecipient');
const CampaignDispatch = require('./CampaignDispatch');
const Message = require('./Message');
const Appointment = require('./Appointment');

// User relations
User.hasMany(Contact, { foreignKey: 'created_by_id', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });

User.hasMany(Group, { foreignKey: 'owner_id', as: 'ownedGroups' });
Group.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// Group relations
Contact.belongsToMany(Group, {
  through: GroupMember,
  as: 'groups',
  foreignKey: 'contactId',
  otherKey: 'groupId',
});
Group.belongsToMany(Contact, {
  through: GroupMember,
  as: 'members',
  foreignKey: 'groupId',
  otherKey: 'contactId',
});
Group.belongsToMany(User, {
  through: GroupMember,
  as: 'userMembers',
  foreignKey: 'groupId',
  otherKey: 'userId',
});

// Campaign relations
User.hasMany(Campaign, { foreignKey: 'created_by_id', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });

Group.hasMany(Campaign, { foreignKey: 'group_id', as: 'campaigns' });
Campaign.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

Campaign.hasMany(CampaignRecipient, {
  foreignKey: 'campaign_id',
  as: 'recipientLinks',
  onDelete: 'CASCADE',
  hooks: true,
});
CampaignRecipient.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

Campaign.hasMany(Message, { foreignKey: 'campaign_id', as: 'messages', onDelete: 'SET NULL' });
Message.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

Campaign.hasMany(CampaignDispatch, { foreignKey: 'campaign_id', as: 'dispatches', onDelete: 'CASCADE' });
CampaignDispatch.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

Contact.hasMany(Appointment, { foreignKey: 'contact_id', as: 'appointments' });
Appointment.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

const syncDatabase = async () => {
  await sequelize.sync({ alter: false });
};

module.exports = {
  sequelize,
  User,
  Contact,
  Group,
  GroupMember,
  Campaign,
  CampaignRecipient,
  CampaignDispatch,
  Message,
  Appointment,
  syncDatabase,
};
