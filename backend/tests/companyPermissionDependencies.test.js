const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePermissionDependencies } = require('../utils/companyPermissionDependencies');

test('dependent permissions are removed when their prerequisite is absent', () => {
  assert.deepEqual(
    normalizePermissionDependencies(['campaign.send', 'appointment.manage']),
    [],
  );
});

test('dependent permissions remain when prerequisites are enabled', () => {
  assert.deepEqual(
    normalizePermissionDependencies([
      'campaign.view',
      'campaign.send',
      'appointment.view',
      'appointment.manage',
    ]),
    ['campaign.view', 'campaign.send', 'appointment.view', 'appointment.manage'],
  );
});

test('company-wide required permissions satisfy dependencies', () => {
  assert.deepEqual(
    normalizePermissionDependencies(['contact.manage'], ['contact.view']),
    ['contact.manage'],
  );
});

test('sms.send requires at least one supported send permission', () => {
  assert.deepEqual(normalizePermissionDependencies(['sms.send']), []);
  assert.deepEqual(
    normalizePermissionDependencies(['contact.view', 'contact.send', 'sms.send']),
    ['contact.view', 'contact.send', 'sms.send'],
  );
});

test('group.create requires both group.view and contact.view', () => {
  assert.deepEqual(
    normalizePermissionDependencies(['group.view', 'group.create']),
    ['group.view'],
  );
  assert.deepEqual(
    normalizePermissionDependencies([
      'contact.view', 'group.view', 'group.create',
    ]),
    ['contact.view', 'group.view', 'group.create'],
  );
});
