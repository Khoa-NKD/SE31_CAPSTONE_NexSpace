import type { CancellationRule } from '../api/types';

export function defaultCancellationRules(): CancellationRule[] {
  return [
    { minHoursBeforeStart: 24, refundPercent: 100 },
    { minHoursBeforeStart: 12, refundPercent: 50 },
    { minHoursBeforeStart: 2, refundPercent: 25 },
    { minHoursBeforeStart: 0, refundPercent: 0 }
  ];
}

export function cancellationPolicyError(
  rules: CancellationRule[] | undefined,
  c: (en: string, vi: string) => string
): string | null {
  if (!Array.isArray(rules) || rules.length === 0)
    return c(
      'Add at least one refund tier or restore the default policy.',
      'Cần có ít nhất một mốc hoàn tiền. Hãy thêm mốc hoặc khôi phục mặc định.'
    );
  const seen = new Set<number>();
  for (const rule of rules) {
    if (
      !rule ||
      !Number.isSafeInteger(rule.minHoursBeforeStart) ||
      rule.minHoursBeforeStart < 0 ||
      rule.minHoursBeforeStart > 2147483647
    )
      return c(
        'Hours must be a nonnegative whole number.',
        'Số giờ phải là số nguyên không âm hợp lệ.'
      );
    if (seen.has(rule.minHoursBeforeStart))
      return c('Hour thresholds must be unique.', 'Các mốc giờ không được trùng nhau.');
    seen.add(rule.minHoursBeforeStart);
    if (
      !Number.isFinite(rule.refundPercent) ||
      rule.refundPercent < 0 ||
      rule.refundPercent > 100 ||
      Math.abs(rule.refundPercent * 100 - Math.round(rule.refundPercent * 100)) > 0.000001
    )
      return c(
        'Refunds must be 0–100%, with at most two decimal places.',
        'Tỷ lệ hoàn từ 0 đến 100%, tối đa 2 chữ số thập phân.'
      );
  }
  // The configured array remains untouched while a user edits its rows.
  // eslint-disable-next-line unicorn/no-array-sort
  const sorted = [...rules].sort((a, b) => a.minHoursBeforeStart - b.minHoursBeforeStart);
  if (
    sorted.some((rule, index) => index > 0 && rule.refundPercent < sorted[index - 1].refundPercent)
  )
    return c(
      'Earlier cancellation cannot refund less than later cancellation.',
      'Hủy càng sớm thì tỷ lệ hoàn không được thấp hơn hủy sát giờ.'
    );
  return null;
}
