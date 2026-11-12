import type { AiNewType } from '../api/floor-design';
import { resourceUsageKinds } from './resource-usage-kinds.ts';

export type AiTypeIssue = 'name' | 'usage' | 'dimensions' | 'capacity' | 'currency' | 'price';
/** A preview may be unpriced; persistence requires a complete, explicitly confirmed configuration. */
export function aiTypeIssues(type: AiNewType): AiTypeIssue[] {
  const issues: AiTypeIssue[] = [];
  if (!type.name.trim() || type.name.trim().length > 100) issues.push('name');
  if (
    !resourceUsageKinds.some(
      (item) => item.value === type.usageKind && item.category === type.category
    )
  )
    issues.push('usage');
  if (
    ![type.standardWidthM, type.standardLengthM].every(
      (value) => Number.isFinite(value) && value >= 0.01 && value <= 10000
    )
  )
    issues.push('dimensions');
  if (
    !Number.isInteger(type.capacity) ||
    type.capacity < 1 ||
    type.capacity > 10000 ||
    (type.category === 'DESK' && type.capacity !== 1)
  )
    issues.push('capacity');
  if (type.currency !== 'VND' && type.currency !== 'USD') issues.push('currency');
  const prices = [type.pricePerHour, type.pricePerDay, type.pricePerMonth];
  if (
    !prices.some((value) => value !== null && Number.isFinite(value) && value > 0) ||
    !prices.every((value) => value === null || (Number.isFinite(value) && value > 0))
  )
    issues.push('price');
  return issues;
}
