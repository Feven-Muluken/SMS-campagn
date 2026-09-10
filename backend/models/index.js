const { sequelize } = require('../config/db');
const User = require('./User');
const Contact = require('./Contact');
const ContactLocation = require('./ContactLocation');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Campaign = require('./Campaign');
const CampaignRecipient = require('./CampaignRecipient');
const CampaignDispatch = require('./CampaignDispatch');
const Message = require('./Message');
const Conversation = require('./Conversation');
const InternalConversation = require('./InternalConversation');
const InternalMessage = require('./InternalMessage');
const Appointment = require('./Appointment');
const Company = require('./Company');
const CompanyUser = require('./CompanyUser');
const CompanyPermission = require('./CompanyPermission');
const CompanySenderId = require('./CompanySenderId');
const SenderIdRequest = require('./SenderIdRequest');
const LiveLocationPing = require('./LiveLocationPing');
const { ensureDbColumns } = require('../config/ensureDbColumns');

// User relations
User.hasMany(User, { foreignKey: 'created_by_id', as: 'createdUsers', constraints: false });
User.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator', constraints: false });
User.hasMany(Contact, { foreignKey: 'created_by_id', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });
Contact.hasOne(ContactLocation, { foreignKey: 'contact_id', as: 'location', onDelete: 'CASCADE', hooks: true });
ContactLocation.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

User.hasMany(Group, { foreignKey: 'owner_id', as: 'ownedGroups' });
Group.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
Company.hasMany(Group, { foreignKey: 'company_id', as: 'groups', constraints: false });
Group.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });

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

// Campaign relations
User.hasMany(Campaign, { foreignKey: 'created_by_id', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });
Company.hasMany(Campaign, { foreignKey: 'company_id', as: 'campaigns', constraints: false });
Campaign.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });

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

Group.hasMany(Message, { foreignKey: 'group_id', as: 'messages', onDelete: 'SET NULL' });
  Message.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
  Company.hasMany(Message, { foreignKey: 'companyId', as: 'messages', constraints: false });
  Message.belongsTo(Company, { foreignKey: 'companyId', as: 'company', constraints: false });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', constraints: false });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation', constraints: false });
Company.hasMany(Conversation, { foreignKey: 'companyId', as: 'conversations', constraints: false });
Conversation.belongsTo(Company, { foreignKey: 'companyId', as: 'company', constraints: false });
Contact.hasMany(Conversation, { foreignKey: 'contactId', as: 'conversations', constraints: false });
Conversation.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact', constraints: false });
User.hasMany(Conversation, { foreignKey: 'ownerUserId', as: 'ownedContactConversations', constraints: false });
Conversation.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner', constraints: false });
User.hasMany(Conversation, { foreignKey: 'assignedToId', as: 'assignedConversations', constraints: false });
Conversation.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignee', constraints: false });
Campaign.hasMany(Conversation, { foreignKey: 'sourceCampaignId', as: 'sourceConversations', constraints: false });
Conversation.belongsTo(Campaign, { foreignKey: 'sourceCampaignId', as: 'sourceCampaign', constraints: false });
InternalConversation.hasMany(InternalMessage, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
InternalMessage.belongsTo(InternalConversation, { foreignKey: 'conversationId', as: 'conversation' });
Company.hasMany(InternalConversation, { foreignKey: 'companyId', as: 'internalConversations' });
InternalConversation.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.hasMany(InternalConversation, { foreignKey: 'createdById', as: 'createdInternalConversations' });
InternalConversation.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });
User.hasMany(InternalConversation, { foreignKey: 'recipientUserId', as: 'receivedInternalConversations' });
InternalConversation.belongsTo(User, { foreignKey: 'recipientUserId', as: 'recipient' });
User.hasMany(InternalMessage, { foreignKey: 'senderId', as: 'internalMessages' });
InternalMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Message, { foreignKey: 'sentById', as: 'sentMessages', constraints: false });
Message.belongsTo(User, { foreignKey: 'sentById', as: 'sentBy', constraints: false });

Campaign.hasMany(CampaignDispatch, { foreignKey: 'campaign_id', as: 'dispatches', onDelete: 'CASCADE' });
CampaignDispatch.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

Contact.hasMany(Appointment, { foreignKey: 'contact_id', as: 'appointments' });
Appointment.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });
User.hasMany(Appointment, { foreignKey: 'created_by_id', as: 'createdAppointments', constraints: false });
Appointment.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator', constraints: false });
Company.hasMany(Appointment, { foreignKey: 'company_id', as: 'appointments', constraints: false });
Appointment.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });

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
User.hasMany(Company, { foreignKey: 'created_by_id', as: 'createdCompanies', constraints: false });
Company.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator', constraints: false });

Company.hasMany(CompanyPermission, { foreignKey: 'company_id', as: 'companyPermissions', constraints: false });
CompanyPermission.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });

Company.hasMany(CompanySenderId, { foreignKey: 'company_id', as: 'senderIds', constraints: false });
CompanySenderId.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });

// Sender ID request relations (for admin review workflow)
Company.hasMany(SenderIdRequest, { foreignKey: 'company_id', as: 'senderIdRequests', constraints: false });
SenderIdRequest.belongsTo(Company, { foreignKey: 'company_id', as: 'company', constraints: false });
SenderIdRequest.belongsTo(User, { foreignKey: 'requested_by_id', as: 'requester', constraints: false });
SenderIdRequest.belongsTo(User, { foreignKey: 'reviewed_by_id', as: 'reviewer', constraints: false });

const syncDatabase = async () => {
  const runMaintenance = process.env.NODE_ENV !== 'production' ||
    String(process.env.DB_RUN_STARTUP_MAINTENANCE || '').toLowerCase() === 'true';
  if (runMaintenance) {
    // Existing installations may need new columns before Sequelize can create
    // indexes declared by the current models. The helper tolerates tables that
    // do not exist yet, so it is safe to run before sync for fresh databases.
    await ensureDbColumns();
  }
  await sequelize.sync({ alter: false });
  if (runMaintenance) {
    // A fresh database gets its tables from sync; run once more so any
    // compatibility adjustments that require those tables are applied.
    await ensureDbColumns();
  }
};

module.exports = {
  sequelize,
  User,
  Contact,
  ContactLocation,
  Group,
  GroupMember,
  Campaign,
  CampaignRecipient,
  CampaignDispatch,
  Message,
  Conversation,
  InternalConversation,
  InternalMessage,
  Appointment,
  Company,
  CompanyUser,
  CompanyPermission,
  CompanySenderId,
  SenderIdRequest,
  LiveLocationPing,
  syncDatabase,
};
