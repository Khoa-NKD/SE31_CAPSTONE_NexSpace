import type { AnalyticsFilter, Trend } from './api';

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function preset(days: number): Pick<AnalyticsFilter, 'from' | 'to'> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { from: localDate(start), to: localDate(end) };
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
