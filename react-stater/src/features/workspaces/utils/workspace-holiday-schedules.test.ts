import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hydrateHolidaySchedules,
  holidayScheduleError,
  formatHolidayDates
} from './workspace-holiday-schedules.ts';
import { holidayBookingError } from './workspace-holidays.ts';

test('single-day and range schedules require valid inclusive dates', () => {
  const single = { code: 'NEW_YEAR', startDate: '2030-01-01', endDate: '2030-01-01' };
  assert.equal(holidayScheduleError(['NEW_YEAR'], [single]), null);
  assert.equal(formatHolidayDates(single), 'Nghỉ 1 ngày · 01/01/2030');
  assert.match(
    holidayScheduleError(['NEW_YEAR'], [{ ...single, endDate: '2029-12-31' }])!,
    /không được trước/
  );
  assert.match(
    holidayScheduleError(['NEW_YEAR'], [{ ...single, startDate: '2030-02-30' }])!,
    /hợp lệ/
  );
  assert.match(holidayScheduleError(['NEW_YEAR'], [])!, /từng dịp lễ/);
  assert.match(holidayScheduleError(['NEW_YEAR'], [single, single])!, /một lịch nghỉ/);
});

test('legacy calendar ranges become inclusive dates, while explicit dates are preserved', () => {
  const original = { code: 'NEW_YEAR', startDate: '2030-01-02', endDate: '2030-01-03' };
  assert.deepEqual(
    hydrateHolidaySchedules(
      { holidayCodes: ['NEW_YEAR'], holidaySchedules: [original] },
      '2026-11-25'
    ),
    [original]
  );
  assert.deepEqual(
    hydrateHolidaySchedules(
      {
        holidayCodes: ['LUNAR_NEW_YEAR'],
        holidayPeriods: [
          { code: 'LUNAR_NEW_YEAR', start: '2026-02-16T00:00:00', end: '2026-02-21T00:00:00' },
          { code: 'LUNAR_NEW_YEAR', start: '2027-02-04T00:00:00', end: '2027-02-09T00:00:00' }
        ]
      },
      '2026-11-25'
    ),
    [{ code: 'LUNAR_NEW_YEAR', startDate: '2027-02-04', endDate: '2027-02-08' }]
  );
});

test('unknown legacy dates stay incomplete instead of inventing a holiday', () => {
  assert.deepEqual(hydrateHolidaySchedules({ holidayCodes: ['NATIONAL_DAY'] }, '2030-01-01'), [
    { code: 'NATIONAL_DAY', startDate: '', endDate: '' }
  ]);
});

test('custom holidays block only their interval, not the entire unknown calendar year', () => {
  const workspace = {
    holidayCodes: ['LUNAR_NEW_YEAR'],
    holidayCalendarThroughYear: 2027,
    holidaySchedules: [{ code: 'LUNAR_NEW_YEAR', startDate: '2030-02-01', endDate: '2030-02-03' }],
    holidayPeriods: [
      {
        code: 'LUNAR_NEW_YEAR',
        name: 'Tết Nguyên đán',
        start: '2030-02-01T00:00:00',
        end: '2030-02-04T00:00:00'
      }
    ]
  };
  assert.match(
    holidayBookingError(workspace, '2030-02-03T23:00:00', '2030-02-04T00:00:00')!,
    /Tết Nguyên đán/
  );
  assert.equal(holidayBookingError(workspace, '2030-01-31T23:00:00', '2030-02-01T00:00:00'), null);
  assert.equal(holidayBookingError(workspace, '2030-02-04T00:00:00', '2030-02-04T01:00:00'), null);
  assert.equal(holidayBookingError(workspace, '2031-02-01T00:00:00', '2031-02-01T01:00:00'), null);
});
