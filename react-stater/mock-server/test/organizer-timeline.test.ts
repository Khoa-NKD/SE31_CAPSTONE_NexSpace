import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventsForResource,
  positionEvents,
  timelineEvents,
  type TimelineEvent
} from '../../src/features/organizer-schedule/timeline.ts';
import type { BookingDto } from '../../src/features/workspaces/api/booking-types';
import type { OperationResource } from '../../src/features/organizer-operations/api';

const resource = (id: number, parentRoomId: number | null, category: 'ROOM' | 'DESK' = 'DESK') =>
  ({ id, parentRoomId, category }) as OperationResource;
const room = resource(1, null, 'ROOM'),
  desk = resource(2, 1),
  sibling = resource(3, 1),
  outside = resource(4, null);
const event = (
  id: number,
  resourceId: number,
  parentRoomId: number | null,
  startTime = '2026-11-19T09:00:00',
  endTime = '2026-11-19T11:00:00'
): TimelineEvent => ({
  key: String(id),
  resourceId,
  parentRoomId,
  title: 'Booking',
  startTime,
  endTime,
  status: 'CONFIRMED'
});

test('room booking is inherited by its seats while open seats remain independent', () => {
  const rows = [event(1, 1, null), event(2, 4, null)];
  assert.deepEqual(
    eventsForResource(rows, desk).map((e) => e.key),
    ['1']
  );
  assert.deepEqual(
    eventsForResource(rows, sibling).map((e) => e.key),
    ['1']
  );
  assert.deepEqual(
    eventsForResource(rows, outside).map((e) => e.key),
    ['2']
  );
});
test('child-seat block affects its room but not sibling seats', () => {
  const rows = [event(1, 2, 1)];
  assert.equal(eventsForResource(rows, room).length, 1);
  assert.equal(eventsForResource(rows, desk).length, 1);
  assert.equal(eventsForResource(rows, sibling).length, 0);
  assert.equal(eventsForResource(rows, outside).length, 0);
});
test('overnight events are clipped rather than hidden or wrapped backwards', () => {
  const rows = [
    event(1, 1, null, '2026-11-18T23:00:00', '2026-11-19T02:00:00'),
    event(2, 1, null, '2026-11-20T00:00:00', '2026-11-20T02:00:00')
  ];
  const positions = positionEvents(rows, '2026-11-19T00:00:00', '2026-11-20T00:00:00');
  assert.equal(positions.length, 1);
  assert.equal(positions[0].left, 0);
  assert.equal(positions[0].end - positions[0].start, 7200000);
  assert.equal(positions[0].width.toFixed(6), '8.333333');
});
test('overlapping events receive separate lanes and adjacent events share a lane', () => {
  const rows = [
    event(1, 1, null),
    event(2, 1, null, '2026-11-19T10:00:00', '2026-11-19T12:00:00'),
    event(3, 1, null, '2026-11-19T11:00:00', '2026-11-19T12:00:00')
  ];
  const positioned = positionEvents(rows, '2026-11-19T00:00:00', '2026-11-20T00:00:00');
  assert.deepEqual(
    positioned.map((p) => p.lane),
    [0, 1, 0]
  );
  assert.equal(rows[0].key, '1');
});
test('cancelled, expired and expired payment holds never occupy the timeline', () => {
  const common = {
    resourceId: 1,
    startTime: '2026-11-19T09:00:00',
    endTime: '2026-11-19T10:00:00',
    bookingCode: 'B1'
  };
  const bookings = [
    { ...common, id: 1, status: 'CANCELLED' },
    { ...common, id: 2, status: 'EXPIRED' },
    {
      ...common,
      id: 3,
      status: 'PENDING_PAYMENT',
      holdExpiresAt: '2026-11-19T08:00:00',
      serverTime: '2026-11-19T08:00:00'
    },
    { ...common, id: 4, status: 'CONFIRMED' }
  ] as BookingDto[];
  assert.deepEqual(
    timelineEvents(bookings, [], [room], new Date('2026-11-19T08:00:00')).map((e) => e.key),
    ['booking:4']
  );
});
