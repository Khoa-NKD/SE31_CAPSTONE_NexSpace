/** Room labels and copy numbers identify placed instances, not reusable furnishing types. */
export function furnishingPresetKey(kind: string, label: string, icon?: string | null): string {
  const name = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
  if (/\b(tv|tivi|television)\b/.test(name)) return `${kind}:TV`;
  const type = name
    .replace(/\s*\((?:ban sao|copy)\)\s*$/g, '')
    .replace(/\s*(?:[-–—·]\s*)?\b(?:room|phong|floor|tang|khu vuc)\b.*$/, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${kind}:${icon ?? ''}:${type || name}`;
}
