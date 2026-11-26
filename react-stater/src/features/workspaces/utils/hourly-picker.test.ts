import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hourlySlots,
  hourlyTimestamp,
  hourlyTimeLabel,
  resolveHourlyHours
} from './hourly-picker.ts';

const monday = [{ dayOfWeek: 1, openTime: '08:00', closeTime: '20:00' }];
const now = new Date('2030-01-06T12:00:00');
test('hourly picker restores half-hour choices and ends exactly at closing', () => {
  const slots = hourlySlots({ date: '2030-01-07', hours: monday, now });
  assert.equal(slots.starts[0], 480);
  assert.equal(slots.starts.at(-1), 1170);
  assert.deepEqual(slots.ends(1140), [1170, 1200]);
  assert.equal(
    slots.starts.every((minute) => minute % 30 === 0),
    true
  );
});
test('today offers the next half-hour without an advance booking buffer', () => {
  const slots = hourlySlots({
    date: '2030-01-07',
    hours: monday,
    now: new Date('2030-01-07T09:16:00')
  });
  assert.equal(slots.starts[0], 570);
});
test('full-day hours end at the following midnight', () => {
  assert.equal(hourlyTimestamp('2030-01-07', 1440), '2030-01-08T00:00:00');
  assert.match(hourlyTimeLabel(1440), /12:00 AM.*1 ngày/);
  const fullDay = [{ dayOfWeek: 1, openTime: '00:00', closeTime: '00:00', is24Hours: true }];
  const slots = hourlySlots({ date: '2030-01-07', hours: fullDay, now });
  assert.equal(slots.starts[0], 0);
  assert.equal(slots.starts.at(-1), 1410);
  assert.equal(slots.ends(1380).at(-1), 1440);
});
test('legacy fallback hours and explicit closed days retain their original behavior', () => {
  const fallback = hourlySlots({ date: '2030-01-07', hours: [], now });
  assert.equal(fallback.starts[0], 480);
  assert.equal(fallback.starts.at(-1), 1290);
  assert.equal(fallback.close, 1320);
  assert.deepEqual(
    hourlySlots({ date: '2030-01-07', hours: [{ ...monday[0], isClosed: true }], now }).starts,
    []
  );
});
test('legacy half-hour steps originate at the opening time instead of a global time grid', () => {
  const hours = [{ dayOfWeek: 1, openTime: '08:15', closeTime: '10:15' }];
  const slots = hourlySlots({ date: '2030-01-07', hours, now });
  assert.deepEqual(slots.starts, [495, 525, 555, 585]);
  assert.deepEqual(slots.ends(525), [555, 585, 615]);
});

test('homepage search still offers late-night slots without a selected workspace', () => {
  const hours = resolveHourlyHours([]);
  const slots = hourlySlots({ date: '2030-01-07', hours, now: new Date('2030-01-07T22:46:00') });
  assert.deepEqual(slots.starts, [1380, 1410]);
  assert.deepEqual(slots.ends(1410), [1440]);
  assert.equal(hourlyTimestamp('2030-01-07', 1440), '2030-01-08T00:00:00');
});

test('specific workspace hours take priority over unrestricted search hours', () => {
  const hours = resolveHourlyHours(monday, 18);
  const late = hourlySlots({ date: '2030-01-07', hours, now: new Date('2030-01-07T22:46:00') });
  assert.deepEqual(late.starts, []);
  const allDay = [{ dayOfWeek: 1, openTime: '00:00', closeTime: '00:00', is24Hours: true }];
  const open = hourlySlots({
    date: '2030-01-07',
    hours: resolveHourlyHours(allDay, 18),
    now: new Date('2030-01-07T22:46:00')
  });
  assert.deepEqual(open.starts, [1380, 1410]);
});
