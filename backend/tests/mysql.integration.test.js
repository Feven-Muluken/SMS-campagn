const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const ROLE_PERMISSIONS = {
  admin: ['dashboard.view','campaign.view','campaign.create','campaign.manage','campaign.schedule','campaign.send','contact.view','contact.create','contact.manage','contact.send','group.view','group.create','group.manage','group.send','user.manage','sms.send','delivery.view','appointment.view','appointment.manage','inbox.view','inbox.reply','inbox.assign','inbox.status','geo.send','billing.send','company.manage'],
  staff: ['dashboard.view','campaign.view','campaign.create','campaign.manage','campaign.schedule','campaign.send','contact.view','contact.create','contact.manage','contact.send','group.view','group.create','group.manage','group.send','sms.send','delivery.view','appointment.view','appointment.manage','inbox.view','inbox.reply','inbox.status','geo.send','billing.send'],
  viewer: ['dashboard.view','campaign.view','contact.view','group.view','delivery.view','appointment.view','inbox.view'],
};
const mysql = require('mysql2/promise');
require('dotenv').config();

const enabled = process.env.RUN_MYSQL_INTEGRATION === 'true';
const integrationTest = enabled ? test : test.skip;
const databaseName = 'sms_campaign_integration_test';

let adminConnection;
let app;
let models;
let staffToken;
let viewerToken;
let adminToken;
let otherToken;
let platformStaffToken;
let companyA;
let companyB;
let staff;
let other;
let platformStaff;
let companyAdmin;
let contactB;

test.before(async () => {
  if (!enabled) return;
  adminConnection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);

  process.env.DB_NAME = databaseName;
  process.env.JWT_SECRET = 'mysql-integration-test-secret-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'mysql-integration-refresh-secret-different-and-long';
  process.env.NODE_ENV = 'test';
  process.env.APPT_SCHEDULER_ENABLED = 'false';
  process.env.CAMPAIGN_SCHEDULER_ENABLED = 'false';
  process.env.SMS_PROVIDER = 'africastalking';
  process.env.SMS_TEST_PROVIDER = 'true';
  process.env.SMS_PROVIDER_USER_SELECTABLE = 'false';
  process.env.SMS_WEBHOOK_SECRET = 'integration-webhook-secret';
  process.env.SMTP_JSON_TRANSPORT = 'true';
  process.env.FRONTEND_URL = 'https://app.example.test';

  models = require('../models');
  app = require('../server');
  await models.sequelize.sync({ force: true });

  const { createFirstAdmin } = require('../scripts/bootstrapAdmin');
  const admin = await createFirstAdmin({
    name: 'Integration Admin',
    email: 'admin.integration@example.test',
    password: 'StrongAdminPassword123!',
  });
  assert.equal(admin.role, 'admin');
  const adminLogin = await request(app).post('/auth/login').send({
    email: 'admin.integration@example.test', password: 'StrongAdminPassword123!',
  });
  assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
  adminToken = adminLogin.body.token;

  [companyA, companyB] = await Promise.all([
    models.Company.create({ name: 'Integration Company A', slug: 'integration-a', status: 'active' }),
    models.Company.create({ name: 'Integration Company B', slug: 'integration-b', status: 'active' }),
  ]);
  staff = await models.User.create({
    name: 'Tenant Staff', email: 'staff.integration@example.test',
    password: 'StrongStaffPassword123!', role: 'staff', accountScope: 'tenant',
  });
  const viewer = await models.User.create({
    name: 'Tenant Viewer', email: 'viewer.integration@example.test',
    password: 'StrongViewerPassword123!', role: 'viewer', accountScope: 'tenant',
  });
  other = await models.User.create({
    name: 'Other Tenant', email: 'other.integration@example.test',
    password: 'StrongOtherPassword123!', role: 'staff', accountScope: 'tenant',
  });
  platformStaff = await models.User.create({
    name: 'Platform Staff', email: 'platform.staff.integration@example.test',
    password: 'StrongPlatformPassword123!', role: 'staff', accountScope: 'platform',
  });
  companyAdmin = await models.User.create({
    name: 'Company Admin', email: 'company.admin.integration@example.test',
    password: 'StrongCompanyAdmin123!', role: 'viewer', accountScope: 'tenant',
  });
  await models.CompanyUser.bulkCreate([
    { companyId: companyA.id, userId: staff.id, role: 'staff', permissions: ROLE_PERMISSIONS.staff },
    { companyId: companyA.id, userId: viewer.id, role: 'viewer', permissions: ROLE_PERMISSIONS.viewer },
    { companyId: companyB.id, userId: other.id, role: 'staff', permissions: ROLE_PERMISSIONS.staff },
    { companyId: companyB.id, userId: companyAdmin.id, role: 'admin', permissions: ROLE_PERMISSIONS.admin },
  ]);
  await models.CompanyPermission.bulkCreate(
    ['contact.manage', 'group.manage', 'delivery.view', 'sms.send', 'campaign.send',
      'appointment.manage', 'inbox.reply'].map((permissionKey) => ({
      companyId: companyA.id, permissionKey, isEnabled: true,
    }))
  );
  contactB = await models.Contact.create({
    name: 'Private B Contact', phoneNumber: '+251911000002',
    createdById: other.id, companyId: companyB.id,
  });

  const staffLogin = await request(app).post('/auth/login').send({
    email: staff.email, password: 'StrongStaffPassword123!',
  });
  assert.equal(staffLogin.status, 200, JSON.stringify(staffLogin.body));
  staffToken = staffLogin.body.token;
  const viewerLogin = await request(app).post('/auth/login').send({
    email: viewer.email, password: 'StrongViewerPassword123!',
  });
  assert.equal(viewerLogin.status, 200, JSON.stringify(viewerLogin.body));
  viewerToken = viewerLogin.body.token;
  const otherLogin = await request(app).post('/auth/login').send({
    email: other.email, password: 'StrongOtherPassword123!',
  });
  otherToken = otherLogin.body.token;
  const platformStaffLogin = await request(app).post('/auth/login').send({
    email: platformStaff.email, password: 'StrongPlatformPassword123!',
  });
  platformStaffToken = platformStaffLogin.body.token;
});

test.after(async () => {
  if (!enabled) return;
  if (models?.sequelize) await models.sequelize.close();
  if (adminConnection) {
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await adminConnection.end();
  }
});

integrationTest('real MySQL login, contact CRUD, tenant isolation, and group CRUD', async () => {
  const auth = { Authorization: `Bearer ${staffToken}`, 'X-Company-Id': String(companyA.id) };
  const created = await request(app).post('/contacts').set(auth).send({
    name: 'Company A Contact', phoneNumber: '+251911000001', tags: ['vip'],
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const contactAId = created.body.id;

  const list = await request(app).get('/contacts').set(auth);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.data.map((row) => row.id), [contactAId]);

  const dashboard = await request(app).get(`/companies/${companyA.id}/dashboard`).set(auth);
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
  assert.equal(dashboard.body.stats.contactCount, 1);

  const crossTenantDashboard = await request(app)
    .get(`/companies/${companyB.id}/dashboard`)
    .set(auth);
  assert.equal(crossTenantDashboard.status, 403);

  const crossTenant = await request(app).get('/contacts')
    .set({ Authorization: `Bearer ${staffToken}`, 'X-Company-Id': String(companyB.id) });
  assert.equal(crossTenant.status, 403);

  const updated = await request(app).put(`/contacts/${contactAId}`).set(auth)
    .send({ name: 'Updated A Contact' });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.name, 'Updated A Contact');

  const rejectedGroup = await request(app).post('/groups/create').set(auth)
    .send({ name: 'Cross Tenant Group', members: [contactB.id] });
  assert.equal(rejectedGroup.status, 400);

  const group = await request(app).post('/groups/create').set(auth)
    .send({ name: 'Company A Group', members: [contactAId] });
  assert.equal(group.status, 201, JSON.stringify(group.body));
  assert.equal(group.body.companyId, companyA.id);

  const groupList = await request(app).get('/groups').set(auth);
  assert.equal(groupList.status, 200);
  assert.equal(groupList.body.total, 1);

  const renamed = await request(app).put(`/groups/${group.body.id}`).set(auth)
    .send({ name: 'Renamed Company A Group', members: [contactAId] });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.body));

  const viewerDenied = await request(app).put(`/groups/${group.body.id}`).set({
    Authorization: `Bearer ${viewerToken}`, 'X-Company-Id': String(companyA.id),
  }).send({ name: 'Forbidden Rename' });
  assert.equal(viewerDenied.status, 403);

  assert.equal((await request(app).delete(`/groups/${group.body.id}`).set(auth)).status, 200);
  assert.equal((await request(app).delete(`/contacts/${contactAId}`).set(auth)).status, 200);
});

integrationTest('internal inbox recipient discovery and private cross-company messaging', async () => {
  const staffAuth = { Authorization: `Bearer ${staffToken}`, 'X-Company-Id': String(companyA.id) };
  // Membership is authoritative even when legacy user data has a stale scope.
  await other.update({ accountScope: 'platform' });
  const recipients = await request(app).get('/sms/internal-inbox/recipients').set(staffAuth);
  assert.equal(recipients.status, 200, JSON.stringify(recipients.body));
  assert.ok(recipients.body.data.some((row) => row.id === other.id &&
    row.companyName === companyB.name && row.accountScope === 'tenant'));
  assert.ok(!recipients.body.data.some((row) => row.id === other.id && row.accountScope === 'platform'));
  assert.ok(recipients.body.data.some((row) => row.id === platformStaff.id && row.companyName === 'Platform'));
  assert.ok(recipients.body.data.some((row) =>
    row.id === companyAdmin.id && row.role === 'admin'));

  const thread = await request(app).post('/sms/internal-inbox/conversations').set(staffAuth).send({
    recipientUserId: other.id,
    companyId: companyB.id,
    subject: 'Cross-company question',
    message: 'Hello from company A',
  });
  assert.equal(thread.status, 201, JSON.stringify(thread.body));
  assert.equal(thread.body.data.companyId, companyB.id);

  const received = await request(app)
    .get(`/sms/internal-inbox/conversations/${thread.body.data.id}/messages`)
    .set({ Authorization: `Bearer ${otherToken}`, 'X-Company-Id': String(companyB.id) });
  assert.equal(received.status, 200, JSON.stringify(received.body));
  assert.equal(received.body.data.length, 1);
  assert.ok(received.body.data[0].readAt);

  const senderView = await request(app)
    .get(`/sms/internal-inbox/conversations/${thread.body.data.id}/messages`)
    .set(staffAuth);
  assert.equal(senderView.status, 200, JSON.stringify(senderView.body));
  assert.ok(senderView.body.data[0].readAt);

  const adminThread = await request(app)
    .post('/sms/internal-inbox/conversations')
    .set(staffAuth)
    .send({
      recipientUserId: companyAdmin.id,
      companyId: companyA.id,
      message: 'Hello company administrator',
    });
  assert.equal(adminThread.status, 201, JSON.stringify(adminThread.body));
  const archivedInternal = await request(app)
    .patch(`/sms/internal-inbox/conversations/${adminThread.body.data.id}`)
    .set(staffAuth)
    .send({ status: 'archived' });
  assert.equal(archivedInternal.status, 200, JSON.stringify(archivedInternal.body));
  const archivedList = await request(app)
    .get('/sms/internal-inbox/conversations?status=archived')
    .set(staffAuth);
  assert.equal(archivedList.status, 200, JSON.stringify(archivedList.body));
  assert.ok(archivedList.body.data.some((row) => row.id === adminThread.body.data.id));
  const restoredInternal = await request(app)
    .patch(`/sms/internal-inbox/conversations/${adminThread.body.data.id}`)
    .set(staffAuth)
    .send({ status: 'open' });
  assert.equal(restoredInternal.status, 200, JSON.stringify(restoredInternal.body));
  const deletedInternal = await request(app)
    .delete(`/sms/internal-inbox/conversations/${adminThread.body.data.id}`)
    .set(staffAuth);
  assert.equal(deletedInternal.status, 200, JSON.stringify(deletedInternal.body));

  const platformThread = await request(app).post('/sms/internal-inbox/conversations')
    .set({ Authorization: `Bearer ${adminToken}` }).send({
      recipientUserId: platformStaff.id,
      subject: 'Platform operations',
      message: 'Admin to platform staff',
    });
  assert.equal(platformThread.status, 201, JSON.stringify(platformThread.body));
  assert.equal(platformThread.body.data.companyId, null);

  const platformMessages = await request(app)
    .get(`/sms/internal-inbox/conversations/${platformThread.body.data.id}/messages`)
    .set({ Authorization: `Bearer ${platformStaffToken}` });
  assert.equal(platformMessages.status, 200, JSON.stringify(platformMessages.body));
  await other.update({ accountScope: 'tenant' });
});

integrationTest('sender approval, SMS, delivery webhook, inbox, campaign, email reset, and reminder', async () => {
  const auth = { Authorization: `Bearer ${staffToken}`, 'X-Company-Id': String(companyA.id) };
  const adminAuth = { Authorization: `Bearer ${adminToken}` };

  const contact = await request(app).post('/contacts').set(auth).send({
    name: 'Messaging Contact', phoneNumber: '+251911000010',
  });
  assert.equal(contact.status, 201, JSON.stringify(contact.body));

  const senderRequest = await request(app).post('/sender-id-requests').set(auth).send({
    senderId: 'AFROEL', countryCodes: ['ET'], reason: 'Integration acceptance test',
  });
  assert.equal(senderRequest.status, 201, JSON.stringify(senderRequest.body));
  const approval = await request(app)
    .patch(`/sender-id-requests/${senderRequest.body.data.id}/review`)
    .set(adminAuth).send({ status: 'approved' });
  assert.equal(approval.status, 200, JSON.stringify(approval.body));
  assert.ok(await models.CompanySenderId.findOne({
    where: { companyId: companyA.id, senderId: 'AFROEL', status: 'approved' },
  }));

  const sent = await request(app).post('/sms/send-phone').set(auth).send({
    phoneNumber: contact.body.phoneNumber, message: 'Integration direct SMS', senderId: 'AFROEL',
  });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.ok(sent.body.providerMessageId);
  const outbound = await models.Message.findOne({
    where: { providerMessageId: sent.body.providerMessageId },
  });
  assert.equal(outbound.companyId, companyA.id);
  assert.equal(outbound.status, 'sent');

  assert.equal((await request(app).post('/sms/delivery-report')
    .set('x-webhook-secret', process.env.SMS_WEBHOOK_SECRET)
    .send({ messageId: sent.body.providerMessageId, status: 'Delivered' })).status, 200);
  await outbound.reload();
  assert.equal(outbound.status, 'delivered');
  assert.ok(outbound.deliveredAt);

  const conversation = await request(app).post('/sms/inbox/conversations').set(auth).send({
    contactId: contact.body.id, senderId: 'AFROEL',
  });
  assert.equal(conversation.status, 201, JSON.stringify(conversation.body));
  const conversationId = conversation.body.data.id;
  assert.equal(conversation.body.data.ownerUserId, staff.id);

  const viewerAuth = {
    Authorization: `Bearer ${viewerToken}`,
    'X-Company-Id': String(companyA.id),
  };
  const viewerListBefore = await request(app).get('/sms/inbox/conversations').set(viewerAuth);
  assert.equal(viewerListBefore.status, 200, JSON.stringify(viewerListBefore.body));
  assert.ok(!viewerListBefore.body.data.some((row) => row.id === conversationId));
  const viewerCannotReadStaffChat = await request(app)
    .get(`/sms/inbox/conversations/${conversationId}/messages`).set(viewerAuth);
  assert.equal(viewerCannotReadStaffChat.status, 404);
  const viewerConversation = await request(app).post('/sms/inbox/conversations')
    .set(viewerAuth).send({ contactId: contact.body.id, senderId: 'AFROEL' });
  assert.equal(viewerConversation.status, 201, JSON.stringify(viewerConversation.body));
  assert.equal(viewerConversation.body.data.ownerUserId, viewer.id);
  assert.notEqual(viewerConversation.body.data.id, conversationId);
  const viewerReply = await request(app)
    .post(`/sms/inbox/conversations/${viewerConversation.body.data.id}/reply`).set(viewerAuth)
    .send({ message: 'Private viewer contact reply', senderId: 'AFROEL' });
  assert.equal(viewerReply.status, 200, JSON.stringify(viewerReply.body));
  const reply = await request(app)
    .post(`/sms/inbox/conversations/${conversationId}/reply`).set(auth)
    .send({ message: 'Integration inbox reply', senderId: 'AFROEL' });
  assert.equal(reply.status, 200, JSON.stringify(reply.body));
  assert.equal(reply.body.data.status, 'sent');

  const inbound = await request(app).post('/sms/inbound')
    .set('x-webhook-secret', process.env.SMS_WEBHOOK_SECRET)
    .send({ from: contact.body.phoneNumber, to: 'AFROEL', text: 'Customer reply', id: 'inbound-1' });
  assert.equal(inbound.status, 200, JSON.stringify(inbound.body));
  const inboxRows = await models.Message.findAll({
    where: { companyId: companyA.id, channel: 'inbox' },
  });
  assert.ok(inboxRows.some((row) => row.response?.direction === 'inbound'));

  const campaign = await request(app).post('/campaign/create').set(auth).send({
    name: 'Integration Campaign', message: 'Hello {name}', type: 'individual',
    recipientType: 'Contact', recipients: [contact.body.id],
    schedule: new Date(Date.now() + 60_000).toISOString(), recurring: { active: false },
  });
  assert.equal(campaign.status, 201, JSON.stringify(campaign.body));
  await models.Campaign.update(
    { schedule: new Date(Date.now() - 1_000), status: 'pending' },
    { where: { id: campaign.body.id } },
  );
  const { processDueCampaignsOnce } = require('../services/campaignSchedulerService');
  await processDueCampaignsOnce();
  const executedCampaign = await models.Campaign.findByPk(campaign.body.id);
  assert.equal(executedCampaign.status, 'sent');
  assert.ok(await models.Message.findOne({ where: { campaignId: executedCampaign.id, status: 'sent' } }));

  const forgot = await request(app).post('/auth/forgot-password').send({ email: staff.email });
  assert.equal(forgot.status, 200, JSON.stringify(forgot.body));
  assert.equal(forgot.body.emailSent, true);
  assert.ok(forgot.body.verificationToken);
  assert.match(forgot.body.otp, /^\d{6}$/);
  const verified = await request(app).post('/auth/verify-reset-otp').send({
    verificationToken: forgot.body.verificationToken,
    otp: forgot.body.otp,
  });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.ok(verified.body.resetToken);
  const reset = await request(app).post('/auth/reset-password').send({
    token: verified.body.resetToken, newPassword: 'ReplacementPassword123!',
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));
  const replay = await request(app).post('/auth/reset-password').send({
    token: verified.body.resetToken, newPassword: 'ReplayMustNotWork123!',
  });
  assert.equal(replay.status, 400);
  assert.equal((await request(app).post('/auth/login').send({
    email: staff.email, password: 'ReplacementPassword123!',
  })).status, 200);

  const appointment = await request(app).post('/appointments').set(auth).send({
    businessName: 'Afroel', serviceName: 'Consultation', contactId: contact.body.id,
    scheduledAt: new Date(Date.now() + 30_000).toISOString(), reminderMinutesBefore: 1,
    sendConfirmation: false,
  });
  assert.equal(appointment.status, 201, JSON.stringify(appointment.body));
  const { processDueNotificationsOnce } = require('../services/appointmentNotificationService');
  await processDueNotificationsOnce();
  const reminded = await models.Appointment.findByPk(appointment.body.id);
  assert.equal(reminded.companyId, companyA.id);
  assert.ok(reminded.reminderSentAt);

  const archivedInbox = await request(app)
    .patch(`/sms/inbox/conversations/${conversationId}`)
    .set(auth)
    .send({ status: 'archived' });
  assert.equal(archivedInbox.status, 200, JSON.stringify(archivedInbox.body));
  const deletedInbox = await request(app)
    .delete(`/sms/inbox/conversations/${conversationId}`)
    .set(auth);
  assert.equal(deletedInbox.status, 200, JSON.stringify(deletedInbox.body));
  assert.equal(await models.Conversation.count({ where: { id: conversationId } }), 0);
  assert.ok(await models.Message.count({ where: { companyId: companyA.id } }) > 0);
});
