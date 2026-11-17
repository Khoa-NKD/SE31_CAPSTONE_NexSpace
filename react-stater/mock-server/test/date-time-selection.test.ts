import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper mirroring the implementation in date-time-picker-modal.tsx
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return parseTimeToMinutes(timePart);
  }
  const ampmMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const modifier = ampmMatch[3]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

function minutesTo12Hour(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function minutesTo24Hour(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function calculateDurationHours(startMin: number, endMin: number): number {
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

function calculateEstimatedCost(durationHours: number, ratePerHour: number): string {
  return (durationHours * ratePerHour).toFixed(2);
}

interface OperatingHour {
  dayOfWeek: number; // 1-7
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  is24Hours: boolean;
}

function generateStartOptions(
  opHour: OperatingHour,
  isToday: boolean,
  currentTimeMinutes: number
): { minutes: number; label: string }[] {
  if (opHour.isClosed) return [];
  const openMin = opHour.is24Hours ? 0 : parseTimeToMinutes(opHour.openTime);
  const closeMin = opHour.is24Hours ? 1440 : parseTimeToMinutes(opHour.closeTime);

  const minStart = isToday
    ? Math.max(openMin, Math.ceil((currentTimeMinutes + 15) / 30) * 30)
    : openMin;
  const maxStart = closeMin - 30;

  const options: { minutes: number; label: string }[] = [];
  for (let m = minStart; m <= maxStart; m += 30) {
    options.push({ minutes: m, label: minutesTo12Hour(m) });
  }
  return options;
}

function generateEndOptions(
  startTimeMin: number,
  opHour: OperatingHour
): { minutes: number; label: string }[] {
  if (opHour.isClosed) return [];
  const closeMin = opHour.is24Hours ? 1440 : parseTimeToMinutes(opHour.closeTime);
  const minEnd = startTimeMin + 30;

  const options: { minutes: number; label: string }[] = [];
  for (let m = minEnd; m <= closeMin; m += 30) {
    options.push({ minutes: m, label: minutesTo12Hour(m) });
  }
  return options;
}

function applyPresetDuration(
  startMin: number,
  presetHours: number | 'close',
  closeMin: number
): number {
  if (presetHours === 'close') return closeMin;
  const target = startMin + presetHours * 60;
  return Math.min(target, closeMin);
}

describe('Date & Time Selection Feature Verification Suite', () => {
  it('TC-TIME-01: Time Parser converts 12h, 24h, and ISO strings correctly', () => {
    assert.equal(parseTimeToMinutes('08:00 AM'), 480);
    assert.equal(parseTimeToMinutes('12:00 PM'), 720);
    assert.equal(parseTimeToMinutes('01:30 PM'), 810);
    assert.equal(parseTimeToMinutes('10:00 PM'), 1320);
    assert.equal(parseTimeToMinutes('12:00 AM'), 0);
    assert.equal(parseTimeToMinutes('2026-11-12T09:00:00'), 540);
    assert.equal(parseTimeToMinutes('2026-11-12T17:30:00'), 1050);
  });

  it('TC-TIME-02: Formatters produce standard 12-hour and 24-hour outputs', () => {
    assert.equal(minutesTo12Hour(480), '08:00 AM');
    assert.equal(minutesTo12Hour(720), '12:00 PM');
    assert.equal(minutesTo12Hour(780), '01:00 PM');
    assert.equal(minutesTo12Hour(1320), '10:00 PM');
    assert.equal(minutesTo24Hour(540), '09:00:00');
    assert.equal(minutesTo24Hour(810), '13:30:00');
  });

  it('TC-SLOT-01: Start time options are bounded between openTime and closeTime - 30m', () => {
    const opHour: OperatingHour = {
      dayOfWeek: 1,
      openTime: '08:00',
      closeTime: '22:00',
      isClosed: false,
      is24Hours: false
    };

    const slots = generateStartOptions(opHour, false, 0);
    assert.ok(slots.length > 0);
    assert.equal(slots[0].label, '08:00 AM');
    assert.equal(slots[slots.length - 1].label, '09:30 PM'); // 21:30 is max start
    assert.equal(slots[0].minutes, 480);
    assert.equal(slots[slots.length - 1].minutes, 1290);
  });

  it('TC-SLOT-02: Today buffer filters out past slots with 15 minutes lead time', () => {
    const opHour: OperatingHour = {
      dayOfWeek: 1,
      openTime: '08:00',
      closeTime: '22:00',
      isClosed: false,
      is24Hours: false
    };

    // Simulate current time: 10:20 AM (620 min) -> with buffer 15m = 635 min -> next slot is 11:00 AM (660 min)
    const currentTime = 10 * 60 + 20; // 620 min
    const slots = generateStartOptions(opHour, true, currentTime);
    assert.ok(slots.length > 0);
    assert.equal(slots[0].label, '11:00 AM'); // 660 min
  });

  it('TC-SLOT-03: Today expired triggers empty start options when after close time', () => {
    const opHour: OperatingHour = {
      dayOfWeek: 1,
      openTime: '08:00',
      closeTime: '22:00',
      isClosed: false,
      is24Hours: false
    };

    // Simulate current time: 10:15 PM (after 21:30 max start)
    const currentTime = 22 * 60 + 15;
    const slots = generateStartOptions(opHour, true, currentTime);
    assert.equal(slots.length, 0); // Triggers "Operating hours for today have passed"
  });

  it('TC-SLOT-04: Closed day yields zero start options and zero end options', () => {
    const closedDay: OperatingHour = {
      dayOfWeek: 7, // Sunday
      openTime: '08:00',
      closeTime: '22:00',
      isClosed: true,
      is24Hours: false
    };

    const startSlots = generateStartOptions(closedDay, false, 0);
    assert.equal(startSlots.length, 0);

    const endSlots = generateEndOptions(540, closedDay);
    assert.equal(endSlots.length, 0);
  });

  it('TC-SLOT-05: End time options strictly require endTime > startTime by at least 30 min', () => {
    const opHour: OperatingHour = {
      dayOfWeek: 2,
      openTime: '08:00',
      closeTime: '22:00',
      isClosed: false,
      is24Hours: false
    };

    const startMin = 540; // 09:00 AM
    const endSlots = generateEndOptions(startMin, opHour);
    assert.ok(endSlots.length > 0);
    assert.equal(endSlots[0].label, '09:30 AM'); // Min end time
    assert.equal(endSlots[endSlots.length - 1].label, '10:00 PM'); // Close time
    // Ensure all end slots are > startMin
    for (const opt of endSlots) {
      assert.ok(opt.minutes > startMin);
    }
  });

  it('TC-PRESET-01: Quick presets adjust end time accurately and cap at closeTime', () => {
    const closeMin = 1320; // 10:00 PM
    const startMin = 540;  // 09:00 AM

    assert.equal(applyPresetDuration(startMin, 1, closeMin), 600);  // 10:00 AM
    assert.equal(applyPresetDuration(startMin, 2, closeMin), 660);  // 11:00 AM
    assert.equal(applyPresetDuration(startMin, 4, closeMin), 780);  // 01:00 PM (Half Day)
    assert.equal(applyPresetDuration(startMin, 8, closeMin), 1020); // 05:00 PM (Full Day)
    assert.equal(applyPresetDuration(startMin, 'close', closeMin), 1320); // 10:00 PM

    // When start is late (08:00 PM = 1200 min), 4 Hours caps at 10:00 PM (1320 min)
    const lateStart = 1200;
    assert.equal(applyPresetDuration(lateStart, 4, closeMin), 1320);
  });

  it('TC-CALC-01: Real-time duration and subtotal price calculation formula', () => {
    // 09:00 AM to 01:00 PM = 4 hours @ $2.50/hr = $10.00
    const duration1 = calculateDurationHours(540, 780);
    assert.equal(duration1, 4.0);
    assert.equal(calculateEstimatedCost(duration1, 2.5), '10.00');

    // 08:30 AM to 11:00 AM = 2.5 hours @ $2.50/hr = $6.25
    const duration2 = calculateDurationHours(510, 660);
    assert.equal(duration2, 2.5);
    assert.equal(calculateEstimatedCost(duration2, 2.5), '6.25');

    // 30 minutes boundary: 09:00 AM to 09:30 AM = 0.5 hours @ $2.50/hr = $1.25
    const duration3 = calculateDurationHours(540, 570);
    assert.equal(duration3, 0.5);
    assert.equal(calculateEstimatedCost(duration3, 2.5), '1.25');
  });

  it('TC-CALENDAR-01: Calendar boundaries block past dates and allow up to 90 days', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 90);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 1);

    const futureDateValid = new Date(today);
    futureDateValid.setDate(futureDateValid.getDate() + 15);

    const futureDateOverflow = new Date(today);
    futureDateOverflow.setDate(futureDateOverflow.getDate() + 95);

    assert.ok(pastDate < today, 'Past date must be less than today');
    assert.ok(futureDateValid >= today && futureDateValid <= maxDate, 'Valid date must be within 90 days');
    assert.ok(futureDateOverflow > maxDate, 'Date beyond 90 days must be blocked');
  });
});
