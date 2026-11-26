import test from 'node:test';
import assert from 'node:assert/strict';
import { searchHourlySlots, searchIntervalFits } from './search-hourly-slots.ts';

const now = new Date('2030-01-06T12:00:00+07:00');
const window = (start: string, end: string) => ({
  start: '2030-01-07T' + start + ':00',
  end: '2030-01-07T' + end + ':00'
});
test('all venue start times are offered without joining different venues into one booking', () => {
  const slots = searchHourlySlots(
    '2030-01-07',
    [window('08:00', '12:00'), window('12:00', '20:00')],
    now
  );
  assert.equal(slots.starts[0], 480);
  assert.equal(slots.starts.at(-1), 1170);
  assert.equal(slots.ends(600).at(-1), 720);
  assert.equal(slots.ends(600).includes(1200), false);
  assert.equal(slots.ends(720).at(-1), 1200);
});
test('gaps remain unavailable and duplicate intervals do not duplicate options', () => {
  const slots = searchHourlySlots(
    '2030-01-07',
    [window('08:00', '12:00'), window('08:00', '12:00'), window('14:00', '18:00')],
    now
  );
  assert.equal(slots.starts.filter((item) => item === 480).length, 1);
  assert.equal(slots.starts.includes(780), false);
  assert.equal(slots.ends(600).includes(900), false);
});
test('a genuine 24-hour venue permits late search times, while an empty list has no fallback', () => {
  const allDay = [{ start: '2030-01-07T00:00:00', end: '2030-01-08T00:00:00' }];
  const slots = searchHourlySlots('2030-01-07', allDay, new Date('2030-01-07T22:46:00+07:00'));
  assert.deepEqual(slots.starts, [1366, 1380, 1410]);
  assert.equal(slots.ends(1366)[0], 1396);
  assert.deepEqual(slots.ends(1410), [1440]);
  assert.deepEqual(searchHourlySlots('2030-01-07', [], now).starts, []);
});

test('starting now can cross midnight when one resource remains continuously available', () => {
  const intervals = [{ start: '2030-01-07T00:00:00', end: '2030-01-09T00:00:00' }];
  const slots = searchHourlySlots('2030-01-07', intervals, new Date('2030-01-07T23:50:27+07:00'));
  assert.deepEqual(slots.starts, [1430]);
  assert.equal(slots.ends(1430)[0], 1460);
  assert.equal(slots.ends(1430).at(-1), 2870);
});

test('starting now is unavailable if fewer than 30 minutes remain before closing', () => {
  const slots = searchHourlySlots(
    '2030-01-07',
    [window('08:00', '20:00')],
    new Date('2030-01-07T19:31:00+07:00')
  );
  assert.deepEqual(slots.starts, []);
});

test('daily search cannot stitch adjacent windows from different resources', () => {
  const intervals = [
    { start: '2030-01-07T00:00:00', end: '2030-01-08T00:00:00' },
    { start: '2030-01-08T00:00:00', end: '2030-01-09T00:00:00' }
  ];
  assert.equal(searchIntervalFits(intervals, '2030-01-07T00:00:00', '2030-01-09T00:00:00'), false);
  assert.equal(searchIntervalFits(intervals, '2030-01-07T00:00:00', '2030-01-08T00:00:00'), true);
});
