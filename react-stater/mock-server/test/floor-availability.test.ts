import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availabilityInterval,
  availabilityLabel
} from '../../src/features/organizer-resources/utils/availability.ts';
test('availability intervals normalize offsets to UTC and reject invalid ranges', () => {
  assert.deepEqual(availabilityInterval('2026-11-07T08:00:00+07:00', '2026-11-07T09:00:00+07:00'), {
    from: '2026-11-07T01:00:00.000Z',
    to: '2026-11-07T02:00:00.000Z'
  });
  assert.equal(availabilityInterval('invalid', 'invalid'), null);
  assert.equal(availabilityInterval('2026-11-07T01:00Z', '2026-11-07T01:00Z'), null);
});
test('each calendar state has Vietnamese and English labels', () => {
  for (const state of ['AVAILABLE', 'BOOKED', 'LOCKED', 'DISABLED', 'MAINTENANCE'] as const) {
    assert.ok(availabilityLabel(state, true));
    assert.ok(availabilityLabel(state, false));
    assert.notEqual(availabilityLabel(state, true), availabilityLabel(state, false));
  }
});
