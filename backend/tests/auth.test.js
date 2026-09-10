const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('authentication API', () => {
  it('rejects an invalid login payload without touching the database', async () => {
    const response = await request(app).post('/auth/login').send({ email: '', password: '' });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
  });

  it('rejects protected routes without a bearer token', async () => {
    const response = await request(app).get('/contacts');

    assert.equal(response.statusCode, 401);
  });

  it('rejects malformed password reset OTP requests', async () => {
    const response = await request(app).post('/auth/verify-reset-otp').send({
      verificationToken: 'invalid',
      otp: '12',
    });

    assert.equal(response.statusCode, 400);
  });
});
