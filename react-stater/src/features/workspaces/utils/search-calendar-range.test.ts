import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCalendarMonthRange } from './search-calendar-range.ts';

test('dates in one month reuse a range that covers the following day for overnight slots', () => {
  const today = new Date(2026, 10, 27);
  const max = new Date(2027, 1, 25);
  assert.deepEqual(searchCalendarMonthRange(2026, 10, today, max), {
    from: '2026-11-27',
    to: '2026-12-01'
  });
  assert.deepEqual(searchCalendarMonthRange(2026, 11, today, max), {
    from: '2026-12-01',
    to: '2027-01-01'
  });
});

test('the last selectable date retains next-day coverage without fetching beyond the horizon', () => {
  assert.deepEqual(
    searchCalendarMonthRange(2027, 1, new Date(2026, 10, 27), new Date(2027, 1, 25)),
    {
      from: '2027-02-01',
      to: '2027-02-26'
    }
  );
});

test('leap day remains included in a shared monthly calendar', () => {
  assert.deepEqual(
    searchCalendarMonthRange(2028, 1, new Date(2028, 1, 28), new Date(2028, 4, 28)),
    {
      from: '2028-02-28',
      to: '2028-03-01'
    }
  );
});
