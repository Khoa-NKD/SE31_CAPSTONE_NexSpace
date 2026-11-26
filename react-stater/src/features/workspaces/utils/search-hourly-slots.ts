import { hourlyTimestamp } from './hourly-picker.ts';

export interface SearchOperatingInterval {
  start: string;
  end: string;
}

function timestamp(value: string) {
  return +new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + '+07:00');
}

/** A search interval must fit one venue's continuous window, never a union of different venues. */
export function searchHourlySlots(date: string, intervals: SearchOperatingInterval[], now: Date) {
  const windows = intervals
    .map((item) => ({ start: timestamp(item.start), end: timestamp(item.end) }))
    .filter((item) => Number.isFinite(item.start) && item.end > item.start);
  const earliest = Math.floor(+now / 60000) * 60000;
  const fits = (start: number, end: number) => {
    const from = timestamp(hourlyTimestamp(date, start)),
      to = timestamp(hourlyTimestamp(date, end));
    return from >= earliest && windows.some((item) => item.start <= from && item.end >= to);
  };
  const starts: number[] = [];
  for (let minute = 0; minute < 1440; minute += 30) {
    if (fits(minute, minute + 30)) starts.push(minute);
  }
  const currentParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const part = (type: string) => currentParts.find((item) => item.type === type)?.value ?? '';
  if (date === part('year') + '-' + part('month') + '-' + part('day')) {
    const currentMinute = Number(part('hour')) * 60 + Number(part('minute'));
    if (fits(currentMinute, currentMinute + 30) && !starts.includes(currentMinute))
      starts.unshift(currentMinute);
  }
  const ends = (start: number) => {
    const values: number[] = [];
    for (let minute = start + 30; minute <= start + 1440; minute += 30) {
      if (fits(start, minute)) values.push(minute);
    }
    for (let minute = Math.ceil((start + 30) / 30) * 30; minute <= 1440; minute += 30) {
      if (fits(start, minute) && !values.includes(minute)) values.push(minute);
    }
    return values.sort((a, b) => a - b);
  };
  return { starts, ends, close: starts.length ? Math.max(...ends(starts[0])) : 0 };
}

export function searchIntervalFits(
  intervals: SearchOperatingInterval[],
  start: string,
  end: string
) {
  const from = timestamp(start),
    to = timestamp(end);
  return (
    Number.isFinite(from) &&
    to > from &&
    intervals.some((item) => timestamp(item.start) <= from && timestamp(item.end) >= to)
  );
}
