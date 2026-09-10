const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const { rateLimit } = require('../middleware/rateLimit');

test('rate limiter permits the configured number and then returns 429', async () => {
  const app = express();
  app.get('/limited', rateLimit({ windowMs: 60_000, max: 2 }), (_req, res) => {
    res.json({ ok: true });
  });

  assert.equal((await request(app).get('/limited')).status, 200);
  assert.equal((await request(app).get('/limited')).status, 200);
  const blocked = await request(app).get('/limited');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'RATE_LIMITED');
  assert.ok(blocked.headers['retry-after']);
});
