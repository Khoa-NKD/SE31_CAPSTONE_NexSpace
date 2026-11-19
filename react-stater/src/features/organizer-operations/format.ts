import { money } from '../organizer-analytics/format.ts';

export function operationMoney(amount: string | null, currency?: string | null): string {
  if (amount == null || !currency) return '—';
  if (currency === 'VND') return money(amount, 'vi-VN');
  return currency === 'USD' ? money(amount, 'vi-VN').replace('₫', 'US$') : '—';
}
export function floorNumbers(resources: Array<{ floorNumber: number }>): number[] {
  // This sorts a new array; the application targets ES2022, which has no toSorted.
  // eslint-disable-next-line unicorn/no-array-sort
  return [...new Set(resources.map(resource => resource.floorNumber))].sort((a,b) => a-b);
}
export function exportRows(filename: string, rows: unknown[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(',')
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
