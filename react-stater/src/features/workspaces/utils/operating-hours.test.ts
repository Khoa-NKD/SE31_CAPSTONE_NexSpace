import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coversOperatingHours } from './operating-hours.ts';
const days = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i + 1,
  openTime: '00:00',
  closeTime: '00:00',
  is24Hours: true,
  isClosed: false
}));
test('daily booking is exactly 24 continuous hours including midnight', () => {
  assert.equal(coversOperatingHours(days, '2030-01-07T09:00:00', '2030-01-08T09:00:00'), true);
  assert.equal(
    coversOperatingHours(
      days.map((d) => ({ ...d, is24Hours: false, openTime: '08:00', closeTime: '20:00' })),
      '2030-01-07T09:00:00',
      '2030-01-08T09:00:00'
    ),
    false
  );
});
test('overnight windows extend to the following day and use exclusive endpoints', () => {
  const night = [{ dayOfWeek: 1, openTime: '22:00', closeTime: '02:00', closesNextDay: true }];
  assert.equal(coversOperatingHours(night, '2030-01-08T00:30:00', '2030-01-08T02:00:00'), true);
  assert.equal(coversOperatingHours(night, '2030-01-08T00:30:00', '2030-01-08T02:01:00'), false);
  assert.equal(coversOperatingHours([], '2030-01-08T00:30:00', '2030-01-08T02:00:00'), false);
});
