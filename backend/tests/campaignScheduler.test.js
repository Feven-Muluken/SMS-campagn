const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addInterval,
  nextOccurrenceAfter,
} = require('../services/campaignSchedulerService');

test('campaign recurrence advances daily and weekly in UTC', () => {
  const start = new Date('2026-09-03T08:15:00.000Z');

  assert.equal(
    addInterval(start, 'daily').toISOString(),
    '2026-09-04T08:15:00.000Z'
  );
  assert.equal(
    addInterval(start, 'weekly').toISOString(),
    '2026-09-10T08:15:00.000Z'
  );
});

test('monthly recurrence clamps to the final day of shorter months', () => {
  assert.equal(
    addInterval(new Date('2026-01-31T08:15:00.000Z'), 'monthly').toISOString(),
    '2026-02-28T08:15:00.000Z'
  );
  assert.equal(
    addInterval(new Date('2028-01-31T08:15:00.000Z'), 'monthly').toISOString(),
    '2028-02-29T08:15:00.000Z'
  );
});

test('recurrence skips missed slots instead of sending a burst', () => {
  const next = nextOccurrenceAfter(
    new Date('2026-09-01T08:15:00.000Z'),
    'daily',
    new Date('2026-09-03T12:00:00.000Z')
  );

  assert.equal(next.toISOString(), '2026-09-04T08:15:00.000Z');
});

test('unsupported recurrence intervals are rejected', () => {
  assert.equal(addInterval(new Date(), 'yearly'), null);
});
