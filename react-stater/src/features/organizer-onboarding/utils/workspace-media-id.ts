/** Backend Long IDs may arrive as JSON numbers or stored wizard strings. */
export function workspaceMediaId(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
