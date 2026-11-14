import type { TypeOption } from '../api/resources';
import { aiTypeIssues } from './ai-type-validation.ts';

const preferenceLimit = 12;

export function readAiTypePreferences(key: string): number[] {
  try {
    const ids: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(ids)
      ? ids.filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, preferenceLimit)
      : [];
  } catch {
    return [];
  }
}

export function writeAiTypePreferences(key: string, ids: number[]): boolean {
  try {
    if (ids.length) {
      window.localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(0, preferenceLimit)));
    } else {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

export function validAiTypePreferences(ids: number[], catalog: TypeOption[]): number[] {
  return catalog
    .filter(
      (type) =>
        ids.includes(type.id) &&
        type.active &&
        type.usageKind &&
        type.currency &&
        aiTypeIssues({
          ...type,
          tempId: -1,
          usageKind: type.usageKind,
          currency: type.currency,
          standardWidthM: Number(type.standardWidthM),
          standardLengthM: Number(type.standardLengthM),
          pricePerHour: type.pricePerHour === null ? null : Number(type.pricePerHour),
          pricePerDay: type.pricePerDay === null ? null : Number(type.pricePerDay),
          pricePerMonth: type.pricePerMonth === null ? null : Number(type.pricePerMonth)
        }).length === 0
    )
    .map((type) => type.id);
}

export function promptWithAiTypePreferences(prompt: string, ids: number[]): string {
  if (!ids.length) return prompt;
  const preference =
    'Organizer preferences for this workspace. Prefer these resourceTypeIds only when they match the current request and catalog: ' +
    ids.join(', ') +
    '. The current request takes priority.\n\n';
  return preference.length + prompt.length <= 4000 ? preference + prompt : prompt;
}
