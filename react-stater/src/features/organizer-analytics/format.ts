import { formatDateLabel } from '../../lib/format.ts';
import type { AnalyticsFilter, Trend } from './api';

export const ANALYTICS_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

/** Preserve recorded calendar dates and timezone labels when formatting report values. */
export function displayAnalyticsDate(value: string): string {
  return formatDateLabel(value);
}

/** Format YYYY-MM-DD as dd/MM/yyyy for clear Vietnamese financial date display. */
export function formatVnDate(isoDate: string): string {
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Financial calculations use integer cents; Number is used only for chart coordinates. */
export function cents(value: string): bigint {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const result = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  return negative ? -result : result;
}

function decimal(value: bigint): string {
  const abs = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

export function money(value: string, locale: string): string {
  const amount = cents(value);
  const abs = amount < 0n ? -amount : amount;
  const fraction = abs % 100n;
  const separator = locale === 'vi-VN' ? ',' : '.';
  return `${amount < 0n ? '−' : ''}${(abs / 100n).toLocaleString(locale)}${fraction ? separator + String(fraction).padStart(2, '0') : ''} ₫`;
}

/** Compact currency label for chart Y-axes (e.g. 250k, 1,5tr / 1.5M). */
export function compactMoney(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  const isVi = locale === 'vi-VN';
  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 1 });
    return `${sign}${formatted}${isVi ? ' tỷ' : 'B'}`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 });
    return `${sign}${formatted}${isVi ? 'tr' : 'M'}`;
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toLocaleString(locale, { maximumFractionDigits: 0 });
    return `${sign}${formatted}k`;
  }
  return `${sign}${abs.toLocaleString(locale)}`;
}

function comparisonUnits(value: string) {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const amount = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
  return negative ? -amount : amount;
}

export function change(current: string, previous: string): string | null {
  const old = comparisonUnits(previous);
  if (old === 0n) return null;
  const numerator = (comparisonUnits(current) - old) * 10_000n;
  const denominator = old < 0n ? -old : old;
  const magnitude = ((numerator < 0n ? -numerator : numerator) + denominator / 2n) / denominator;
  const delta = numerator < 0n ? -magnitude : magnitude;
  return `${delta > 0n ? '+' : delta < 0n ? '−' : ''}${decimal(delta < 0n ? -delta : delta)}%`;
}

export function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? String(date.getFullYear());
  const m = parts.find((p) => p.type === 'month')?.value ?? String(date.getMonth() + 1).padStart(2, '0');
  const d = parts.find((p) => p.type === 'day')?.value ?? String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get today's YYYY-MM-DD in Asia/Ho_Chi_Minh timezone. */
export function todayInHoChiMinh(): string {
  return localDate(new Date());
}

function formatUtcIso(utcDate: Date): string {
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
}

function parseIsoToUtc(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function addUtcDays(utcDate: Date, days: number): Date {
  const next = new Date(utcDate.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function preset(days: number): Pick<AnalyticsFilter, 'from' | 'to'> {
  const todayIso = todayInHoChiMinh();
  const end = parseIsoToUtc(todayIso);
  const start = addUtcDays(end, -(days - 1));
  return { from: formatUtcIso(start), to: formatUtcIso(end) };
}

export function thisMonthPreset(): Pick<AnalyticsFilter, 'from' | 'to'> {
  return resolveDatePreset('this_month');
}

/**
 * Resolve exact inclusive [from, to] range in Asia/Ho_Chi_Minh timezone.
 * - Week starts on Monday and ends on Sunday.
 * - Active/current periods cap `to` at `today` (no future dates).
 */
export function resolveDatePreset(
  key: Exclude<DatePresetKey, 'custom'>,
  referenceTodayIso: string = todayInHoChiMinh()
): Pick<AnalyticsFilter, 'from' | 'to'> {
  const today = parseIsoToUtc(referenceTodayIso);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-indexed (0 = Jan, 10 = Nov)
  const todayStr = formatUtcIso(today);

  switch (key) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'yesterday': {
      const yest = formatUtcIso(addUtcDays(today, -1));
      return { from: yest, to: yest };
    }
    case 'last_7_days':
      return { from: formatUtcIso(addUtcDays(today, -6)), to: todayStr };
    case 'last_30_days':
      return { from: formatUtcIso(addUtcDays(today, -29)), to: todayStr };
    case 'last_90_days':
      return { from: formatUtcIso(addUtcDays(today, -89)), to: todayStr };
    case 'this_week': {
      // Monday = 0, ..., Sunday = 6
      const offsetFromMonday = (today.getUTCDay() + 6) % 7;
      const monday = addUtcDays(today, -offsetFromMonday);
      return { from: formatUtcIso(monday), to: todayStr };
    }
    case 'last_week': {
      const offsetFromMonday = (today.getUTCDay() + 6) % 7;
      const thisMonday = addUtcDays(today, -offsetFromMonday);
      const lastMonday = addUtcDays(thisMonday, -7);
      const lastSunday = addUtcDays(thisMonday, -1);
      return { from: formatUtcIso(lastMonday), to: formatUtcIso(lastSunday) };
    }
    case 'this_month': {
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      return { from: formatUtcIso(firstOfMonth), to: todayStr };
    }
    case 'last_month': {
      const firstOfLastMonth = new Date(Date.UTC(year, month - 1, 1));
      const lastOfLastMonth = new Date(Date.UTC(year, month, 0));
      return { from: formatUtcIso(firstOfLastMonth), to: formatUtcIso(lastOfLastMonth) };
    }
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const firstOfQuarter = new Date(Date.UTC(year, quarterStartMonth, 1));
      return { from: formatUtcIso(firstOfQuarter), to: todayStr };
    }
    case 'last_quarter': {
      const currentQuarterStartMonth = Math.floor(month / 3) * 3;
      const firstOfLastQuarter = new Date(Date.UTC(year, currentQuarterStartMonth - 3, 1));
      const lastOfLastQuarter = new Date(Date.UTC(year, currentQuarterStartMonth, 0));
      return { from: formatUtcIso(firstOfLastQuarter), to: formatUtcIso(lastOfLastQuarter) };
    }
    case 'this_year': {
      const firstOfYear = new Date(Date.UTC(year, 0, 1));
      return { from: formatUtcIso(firstOfYear), to: todayStr };
    }
    case 'last_year': {
      const firstOfLastYear = new Date(Date.UTC(year - 1, 0, 1));
      const lastOfLastYear = new Date(Date.UTC(year - 1, 11, 31));
      return { from: formatUtcIso(firstOfLastYear), to: formatUtcIso(lastOfLastYear) };
    }
    case 'all_time': {
      // Maximum 366-day verified historical window supported by the analytics engine
      const start = addUtcDays(today, -365);
      return { from: formatUtcIso(start), to: todayStr };
    }
  }
}

/** Compute the previous comparison period of equal length immediately preceding [from, to]. */
export function previousComparisonRange(
  fromIso: string,
  toIso: string
): Pick<AnalyticsFilter, 'from' | 'to'> | null {
  const start = parseIsoToUtc(fromIso);
  const end = parseIsoToUtc(toIso);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(days) || days <= 0) return null;
  const prevFrom = addUtcDays(start, -days);
  const prevTo = addUtcDays(start, -1);
  return { from: formatUtcIso(prevFrom), to: formatUtcIso(prevTo) };
}

export function chartTrends(
  filter: AnalyticsFilter,
  rows: Trend[],
  group: 'day' | 'week' | 'month'
) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const groups = new Map<string, Trend>();
  const end = Date.parse(`${filter.to}T00:00:00Z`);
  for (
    let timestamp = Date.parse(`${filter.from}T00:00:00Z`);
    timestamp <= end;
    timestamp += 86_400_000
  ) {
    const date = new Date(timestamp);
    const day = date.toISOString().slice(0, 10);
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key =
      group === 'month'
        ? day.slice(0, 7)
        : group === 'week'
          ? monday.toISOString().slice(0, 10)
          : day;
    const target = groups.get(key) ?? {
      date: key,
      createdBookings: 0,
      paidBookings: 0,
      receivedAmount: '0',
      refundedAmount: '0',
      netAmount: '0'
    };
    const row = byDate.get(day);
    if (row) {
      target.createdBookings += row.createdBookings;
      target.paidBookings += row.paidBookings;
      for (const field of ['receivedAmount', 'refundedAmount', 'netAmount'] as const)
        target[field] = decimal(cents(target[field]) + cents(row[field]));
    }
    groups.set(key, target);
  }
  return [...groups.values()].map((row) => ({
    ...row,
    received: Number(row.receivedAmount),
    refunded: Number(row.refundedAmount),
    net: Number(row.netAmount)
  }));
}
