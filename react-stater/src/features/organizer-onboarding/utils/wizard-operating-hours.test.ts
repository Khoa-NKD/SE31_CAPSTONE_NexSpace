import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseTimeToMinutes,
  isOperatingTimeRangeValid,
  dayScheduleSchema,
  operatingHoursSchema
} from '../schemas/wizard-schemas.ts';

describe('Wizard Operating Hours Validation Suite', () => {
  describe('parseTimeToMinutes', () => {
    it('parses 12-hour AM/PM format accurately', () => {
      assert.strictEqual(parseTimeToMinutes('12:00 AM'), 0);
      assert.strictEqual(parseTimeToMinutes('08:00 AM'), 480);
      assert.strictEqual(parseTimeToMinutes('12:00 PM'), 720);
      assert.strictEqual(parseTimeToMinutes('08:00 PM'), 1200);
      assert.strictEqual(parseTimeToMinutes('11:30 PM'), 1410);
    });
  });

  describe('isOperatingTimeRangeValid', () => {
    it('returns true when closing time is strictly after opening time', () => {
      assert.strictEqual(isOperatingTimeRangeValid('08:00 AM', '08:00 PM'), true);
      assert.strictEqual(isOperatingTimeRangeValid('09:00 AM', '05:00 PM'), true);
      assert.strictEqual(isOperatingTimeRangeValid('06:00 AM', '11:30 PM'), true);
    });

    it('returns false when closing time is before or equal to opening time', () => {
      // Equal
      assert.strictEqual(isOperatingTimeRangeValid('08:00 AM', '08:00 AM'), false);
      // Inverted / overnight within the same single day window
      assert.strictEqual(isOperatingTimeRangeValid('08:00 PM', '08:00 AM'), false);
      assert.strictEqual(isOperatingTimeRangeValid('10:00 AM', '09:00 AM'), false);
    });
  });

  describe('dayScheduleSchema', () => {
    it('passes for an open day with valid times', () => {
      const validDay = {
        day: 'monday' as const,
        label: 'Monday',
        isOpen: true,
        openTime: '08:00 AM',
        closeTime: '08:00 PM'
      };
      const result = dayScheduleSchema.safeParse(validDay);
      assert.strictEqual(result.success, true);
    });

    it('fails for an open day with invalid times (close <= open)', () => {
      const invalidDay = {
        day: 'monday' as const,
        label: 'Monday',
        isOpen: true,
        openTime: '08:00 PM',
        closeTime: '08:00 AM'
      };
      const result = dayScheduleSchema.safeParse(invalidDay);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues[0].message.includes('Giờ đóng cửa phải sau giờ mở cửa'));
      }
    });

    it('passes for a closed day even if openTime == closeTime', () => {
      const closedDay = {
        day: 'sunday' as const,
        label: 'Sunday',
        isOpen: false,
        openTime: '09:00 AM',
        closeTime: '09:00 AM'
      };
      const result = dayScheduleSchema.safeParse(closedDay);
      assert.strictEqual(result.success, true);
    });
  });

  describe('operatingHoursSchema', () => {
    it('passes when at least one day is open and all open days have valid time intervals', () => {
      const schedule = [
        { day: 'monday' as const, label: 'Monday', isOpen: true, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'tuesday' as const, label: 'Tuesday', isOpen: true, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'wednesday' as const, label: 'Wednesday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'thursday' as const, label: 'Thursday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'friday' as const, label: 'Friday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'saturday' as const, label: 'Saturday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'sunday' as const, label: 'Sunday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' }
      ];
      const result = operatingHoursSchema.safeParse({
        is247: false,
        schedule,
        blockHolidays: true,
        allowGracePeriod: false
      });
      assert.strictEqual(result.success, true);
    });

    it('fails when any open day has closeTime <= openTime', () => {
      const schedule = [
        { day: 'monday' as const, label: 'Monday', isOpen: true, openTime: '08:00 PM', closeTime: '08:00 AM' }, // Invalid!
        { day: 'tuesday' as const, label: 'Tuesday', isOpen: true, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'wednesday' as const, label: 'Wednesday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'thursday' as const, label: 'Thursday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'friday' as const, label: 'Friday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'saturday' as const, label: 'Saturday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' },
        { day: 'sunday' as const, label: 'Sunday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 PM' }
      ];
      const result = operatingHoursSchema.safeParse({
        is247: false,
        schedule,
        blockHolidays: true,
        allowGracePeriod: false
      });
      assert.strictEqual(result.success, false);
    });

    it('passes when is247 is true regardless of individual day hours', () => {
      const schedule = [
        { day: 'monday' as const, label: 'Monday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'tuesday' as const, label: 'Tuesday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'wednesday' as const, label: 'Wednesday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'thursday' as const, label: 'Thursday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'friday' as const, label: 'Friday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'saturday' as const, label: 'Saturday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' },
        { day: 'sunday' as const, label: 'Sunday', isOpen: false, openTime: '08:00 AM', closeTime: '08:00 AM' }
      ];
      const result = operatingHoursSchema.safeParse({
        is247: true,
        schedule,
        blockHolidays: true,
        allowGracePeriod: false
      });
      assert.strictEqual(result.success, true);
    });
  });
});
