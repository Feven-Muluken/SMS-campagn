const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('SMS API', () => {
  it('reports the API and SMS routing configuration as healthy', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, 'messagehub-api');
    assert.ok(Array.isArray(response.body.sms.available));
    assert.ok(['africastalking', 'mobilesms_io'].includes(response.body.sms.default));
  });

  it('does not expose provider configuration without authentication', async () => {
    const response = await request(app).get('/sms/providers');

    assert.equal(response.statusCode, 401);
  });
});
