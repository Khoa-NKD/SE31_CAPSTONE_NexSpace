import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  maintenanceConflicts,
  maintenanceTimeChoices,
  maintenanceTimeConflict
} from './maintenance-time.ts';
import type { MaintenanceTarget } from '../api';
import type { BookingDto } from '../../workspaces/api/booking-types';

const targets: MaintenanceTarget[] = [
  {
    key: 'RESOURCE:1',
    resourceId: 1,
    name: 'Room',
    kind: 'ROOM',
    parentRoomId: null,
    floorNumber: 1
  },
  { key: 'RESOURCE:2', resourceId: 2, name: 'Seat', kind: 'DESK', parentRoomId: 1, floorNumber: 1 },
  {
    key: 'RESOURCE:3',
    resourceId: 3,
    name: 'Other',
    kind: 'DESK',
    parentRoomId: null,
    floorNumber: 1
  },
  {
    key: 'DECORATION:1:table',
    resourceId: null,
    name: 'Table',
    kind: 'DECORATION',
    parentRoomId: 1,
    floorNumber: 1
  }
];
const booking = (resourceId: number, status = 'CONFIRMED', holdExpiresAt?: string) =>
  ({
    resourceId,
    status,
    holdExpiresAt,
    resourceName: 'Reserved resource',
    startTime: '2099-01-01T10:00:00',
    endTime: '2099-01-01T12:00:00'
  }) as BookingDto;
const now = Date.parse('2098-01-01T00:00:00');

test('room, seat and furniture reservations follow both sides of the hierarchy', () => {
  assert.equal(maintenanceConflicts(targets, ['RESOURCE:1'], [booking(2)], [], [], now).length, 1);
  assert.equal(maintenanceConflicts(targets, ['RESOURCE:2'], [booking(1)], [], [], now).length, 1);
  assert.equal(
    maintenanceConflicts(targets, ['DECORATION:1:table'], [booking(2)], [], [], now).length,
    1
  );
  assert.equal(maintenanceConflicts(targets, ['RESOURCE:3'], [booking(2)], [], [], now).length, 0);
});
test('only active reservations block choices; expired, cancelled and completed bookings do not', () => {
  for (const status of ['CONFIRMED', 'CHECKED_IN', 'PENDING_APPROVAL', 'PENDING_PAYMENT'])
    assert.equal(
      maintenanceConflicts(targets, ['RESOURCE:1'], [booking(1, status)], [], [], now).length,
      1
    );
  for (const status of ['CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW'])
    assert.equal(
      maintenanceConflicts(targets, ['RESOURCE:1'], [booking(1, status)], [], [], now).length,
      0
    );
  assert.equal(
    maintenanceConflicts(
      targets,
      ['RESOURCE:1'],
      [booking(1, 'PENDING_PAYMENT', '2097-01-01T00:00:00')],
      [],
      [],
      now
    ).length,
    0
  );
});
test('adjacent ranges remain valid and ranges enclosing a booking are blocked', () => {
  const conflicts = maintenanceConflicts(targets, ['RESOURCE:1'], [booking(1)], [], [], now);
  assert.equal(
    maintenanceTimeConflict('2099-01-01T09:00', '2099-01-01T10:00', conflicts),
    undefined
  );
  assert.equal(maintenanceTimeConflict('2099-01-01T12:00', undefined, conflicts), undefined);
  assert.ok(maintenanceTimeConflict('2099-01-01T10:00', undefined, conflicts));
  assert.ok(maintenanceTimeConflict('2099-01-01T09:00', '2099-01-01T13:00', conflicts));
});
test('choices retain exact reservation boundaries and custom times without duplicate minutes', () => {
  const conflicts = [
    {
      start: '2099-01-01T10:17:30',
      end: '2099-01-01T12:07:00',
      kind: 'hold' as const,
      name: 'Room'
    }
  ];
  const choices = maintenanceTimeChoices('2099-01-01', conflicts, '2099-01-01T13:03');
  assert.ok(choices.includes('10:17:30'));
  assert.ok(choices.includes('12:07:00'));
  assert.ok(choices.includes('13:03:00'));
  assert.equal(choices.filter((time) => time.startsWith('10:00')).length, 1);
});

test('the checkout countdown blocks maintenance now even when usage is tomorrow', () => {
  const held = {
    ...booking(1, 'PENDING_PAYMENT', '2099-01-01T21:50:00'),
    createdAt: '2099-01-01T21:35:00',
    startTime: '2099-01-02T09:00:00',
    endTime: '2099-01-02T13:00:00'
  };
  const conflicts = maintenanceConflicts(
    targets,
    ['RESOURCE:1'],
    [held],
    [],
    [],
    Date.parse('2099-01-01T21:43:00')
  );
  assert.equal(
    maintenanceTimeConflict('2099-01-01T21:44', undefined, conflicts)?.kind,
    'hold-window'
  );
  assert.equal(maintenanceTimeConflict('2099-01-01T21:50', undefined, conflicts), undefined);
  assert.ok(maintenanceTimeConflict('2099-01-02T09:30', undefined, conflicts));
  const expired = maintenanceConflicts(
    targets,
    ['RESOURCE:1'],
    [held],
    [],
    [],
    Date.parse('2099-01-01T21:50:00')
  );
  assert.equal(expired.length, 0);
});

test('a pending approval with a live checkout countdown is also protected', () => {
  const held = {
    ...booking(1, 'PENDING_APPROVAL', '2099-01-01T22:01:20'),
    createdAt: '2099-01-01T21:51:20',
    startTime: '2099-01-02T13:30:00',
    endTime: '2099-01-02T14:30:00'
  };
  const conflicts = maintenanceConflicts(
    targets,
    ['RESOURCE:1'],
    [held],
    [],
    [],
    Date.parse('2099-01-01T21:53:00')
  );
  assert.equal(
    maintenanceTimeConflict('2099-01-01T21:53:33', undefined, conflicts)?.kind,
    'hold-window'
  );
  assert.equal(maintenanceTimeConflict('2099-01-01T22:01:20', undefined, conflicts), undefined);
});

test('date-only maintenance includes the entire end date', () => {
  const reserved = {
    ...booking(1),
    startTime: '2099-01-02T23:00:00',
    endTime: '2099-01-02T23:30:00'
  };
  const conflicts = maintenanceConflicts(targets, ['RESOURCE:1'], [reserved], [], [], now);
  assert.ok(maintenanceTimeConflict('2099-01-01T00:00:00', '2099-01-03T00:00:00', conflicts));
  assert.equal(
    maintenanceTimeConflict('2099-01-03T00:00:00', '2099-01-04T00:00:00', conflicts),
    undefined
  );
});
