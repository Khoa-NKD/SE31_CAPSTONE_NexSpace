import test from 'node:test';
import assert from 'node:assert/strict';
import { customerResourceStatus } from './customer-resource-status.ts';
const room = {
  id: 1,
  code: 'ROOM-1',
  name: 'Room',
  category: 'ROOM',
  posX: 0,
  posY: 0,
  width: 120,
  height: 120,
  rotation: 0,
  state: 'AVAILABLE',
  selectable: true
} as const;
test('maintenance and manual disable remain distinct and cannot be selected even with an old hold', () => {
  for (const state of ['MAINTENANCE', 'DISABLED'] as const) {
    const status = customerResourceStatus({ ...room, state }, undefined, true);
    assert.equal(status.available, false);
    assert.equal(status.state, state);
    assert.equal(status.maintenance, state === 'MAINTENANCE');
  }
});
test('selected-time availability takes precedence over the current floor snapshot', () => {
  const item = { resourceId: 1, state: 'AVAILABLE', selectable: true } as const;
  assert.equal(
    customerResourceStatus({ ...room, state: 'MAINTENANCE' }, item as never).available,
    true
  );
  assert.equal(
    customerResourceStatus(room, { ...item, state: 'DISABLED' } as never).available,
    false
  );
});
test('my own valid hold may resume but another customer hold cannot be selected', () => {
  const item = { resourceId: 1, state: 'LOCKED', selectable: false } as const;
  assert.equal(customerResourceStatus(room, item as never, false).available, false);
  assert.equal(customerResourceStatus(room, item as never, true).available, true);
});

test('manual disable in the selected interval does not paint an ongoing maintenance gray', () => {
  const status = customerResourceStatus({ ...room, state: 'MAINTENANCE' }, {
    resourceId: 1,
    state: 'DISABLED',
    selectable: false
  } as never);
  assert.equal(status.state, 'MAINTENANCE');
  assert.equal(status.maintenance, true);
  assert.equal(status.disabled, false);
  assert.equal(status.available, false);
});
