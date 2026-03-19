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
const Company = require('./Company');
const CompanyUser = require('./CompanyUser');
const ContactLocation = require('./ContactLocation');

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

Contact.hasOne(ContactLocation, { foreignKey: 'contactId', as: 'location', onDelete: 'CASCADE' });
ContactLocation.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

// Company relations
Company.belongsToMany(User, {
  through: CompanyUser,
  as: 'users',
  foreignKey: 'companyId',
  otherKey: 'userId',
  constraints: false,
});
User.belongsToMany(Company, {
  through: CompanyUser,
  as: 'companies',
  foreignKey: 'userId',
  otherKey: 'companyId',
  constraints: false,
});
Company.hasMany(CompanyUser, { foreignKey: 'companyId', as: 'memberships', constraints: false });
CompanyUser.belongsTo(Company, { foreignKey: 'companyId', as: 'company', constraints: false });
User.hasMany(CompanyUser, { foreignKey: 'userId', as: 'companyMemberships', constraints: false });
CompanyUser.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

const syncDatabase = async () => {
  const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
  await sequelize.sync({ alter: shouldAlter });
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
  Company,
  CompanyUser,
  ContactLocation,
  syncDatabase,
};
