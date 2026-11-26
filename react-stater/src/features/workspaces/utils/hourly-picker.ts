import { localTimestamp, type OperatingWindow } from './operating-hours.ts';

export function hourlyTimestamp(date: string, minutes: number) {
  const value = new Date(date + 'T00:00:00');
  value.setMinutes(minutes);
  return localTimestamp(value);
}

export function hourlyTimeLabel(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}${minutes >= 1440 ? ' (+1 ngày)' : ''}`;
}

export const DEFAULT_HOURLY_HOURS: OperatingWindow[] = Array.from({ length: 7 }, (_, index) => ({
  dayOfWeek: index + 1,
  openTime: '08:00',
  closeTime: '22:00',
  isClosed: false,
  is24Hours: false
}));

/** Search has no selected workspace, so it must not invent a closing time. */
const SEARCH_HOURLY_HOURS: OperatingWindow[] = Array.from({ length: 7 }, (_, index) => ({
  dayOfWeek: index + 1,
  openTime: '00:00',
  closeTime: '00:00',
  isClosed: false,
  is24Hours: true
}));

export function resolveHourlyHours(hours: OperatingWindow[], workspaceId?: string | number) {
  if (hours.length) return hours;
  return workspaceId ? DEFAULT_HOURLY_HOURS : SEARCH_HOURLY_HOURS;
}

/** Preserve the original hourly picker's per-day bounds and opening-relative half-hour steps. */
export function hourlySlots({
  date,
  hours,
  now
}: {
  date: string;
  hours: OperatingWindow[];
  now: Date;
}) {
  const day = new Date(date + 'T00:00:00');
  const effectiveHours = hours.length ? hours : DEFAULT_HOURLY_HOURS;
  const row = effectiveHours.find((item) => item.dayOfWeek === (day.getDay() || 7)) ?? {
    dayOfWeek: day.getDay() || 7,
    openTime: '08:00',
    closeTime: '22:00',
    isClosed: false,
    is24Hours: false
  };
  const minute = (time: string) => {
    const [hour, minutes] = time.split(':').map(Number);
    return hour * 60 + minutes;
  };
  const open = row.is24Hours ? 0 : minute(row.openTime || '08:00');
  const close = row.is24Hours ? 1440 : minute(row.closeTime || '22:00');
  const today =
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate();
  const earliest = today
    ? Math.max(open, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30)
    : open;
  const starts: number[] = [];
  if (!row.isClosed)
    for (let value = earliest; value <= close - 30; value += 30) starts.push(value);
  const ends = (start: number) => {
    const values: number[] = [];
    if (!row.isClosed && starts.length)
      for (let value = start + 30; value <= close; value += 30) values.push(value);
    return values;
  };
  return { starts, ends, open, close, isClosed: !!row.isClosed, row };
}
