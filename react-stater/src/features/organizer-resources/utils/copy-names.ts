const copyNameSuffix = /\s*\((?:copy|bản sao)(?:\s+(\d+))?\)\s*$/iu;
const copyCodeSuffix = /-C(\d+)$/i;
const comparable = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi');
const cleanCode = (value: string) => value.replace(/[^A-Za-z0-9._-]/g, '').toUpperCase();
const copyIndex = (value: string | undefined) => {
  const number = Number(value ?? 1);
  return Number.isSafeInteger(number) && number > 0 && number < 1_000_000_000 ? number : 0;
};

/** Strip only generated copy markers; meaningful numbers in the original name remain intact. */
function nameStem(value: string): string {
  let result = value.normalize('NFC').trim();
  while (copyNameSuffix.test(result)) result = result.replace(copyNameSuffix, '').trim();
  return result;
}

export function copyDisplayName(
  source: string,
  existing: string[],
  language: 'en' | 'vi',
  maxLength = 150
): string {
  const stem =
    nameStem(source).slice(0, Math.max(1, maxLength - 20)) ||
    (language === 'vi' ? 'Đối tượng' : 'Object');
  let last = 0;
  for (const value of [source, ...existing]) {
    const match = value.normalize('NFC').match(copyNameSuffix);
    if (
      match &&
      comparable(nameStem(value).slice(0, Math.max(1, maxLength - 20))) === comparable(stem)
    ) {
      last = Math.max(last, copyIndex(match[1]));
    }
  }
  const occupied = new Set(existing.map(comparable));
  for (let next = last + 1; ; next++) {
    const suffix = ` (${language === 'vi' ? 'bản sao' : 'copy'} ${next})`;
    const candidate = stem.slice(0, maxLength - suffix.length) + suffix;
    if (!occupied.has(comparable(candidate))) return candidate;
  }
}

/** A reserved copy suffix avoids confusing domain numbers (e.g. ROOM-201) with copy counters. */
export function copyResourceCode(source: string, existing: string[]): string {
  const stem = cleanCode(source).replace(copyCodeSuffix, '').slice(0, 40) || 'RESOURCE';
  const occupied = new Set(existing.map(cleanCode));
  let last = 0;
  for (const value of [source, ...existing]) {
    const normalized = cleanCode(value);
    const match = normalized.match(copyCodeSuffix);
    if (match && normalized.replace(copyCodeSuffix, '').slice(0, 40) === stem) {
      last = Math.max(last, copyIndex(match[1]));
    }
  }
  for (let next = last + 1; ; next++) {
    const suffix = `-C${next}`;
    const candidate = stem.slice(0, 50 - suffix.length) + suffix;
    if (!occupied.has(candidate)) return candidate;
  }
}
