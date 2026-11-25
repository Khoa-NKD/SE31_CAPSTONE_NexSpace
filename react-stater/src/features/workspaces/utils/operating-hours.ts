export interface OperatingWindow {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed?: boolean;
  is24Hours?: boolean;
  closesNextDay?: boolean;
}
export function localTimestamp(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}
/** Mirror backend half-open coverage; a missing day never means unrestricted access. */
export function coversOperatingHours(
  hours: OperatingWindow[],
  start: string,
  end: string
): boolean {
  const from = new Date(start),
    to = new Date(end);
  if (!hours.length || !Number.isFinite(+from) || !Number.isFinite(+to) || +to <= +from)
    return false;
  const windows: { from: number; to: number }[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - 1);
  while (+day <= +to) {
    const row = hours.find((h) => h.dayOfWeek === (day.getDay() || 7));
    if (row && !row.isClosed) {
      const a = new Date(day),
        b = new Date(day);
      if (row.is24Hours) b.setDate(b.getDate() + 1);
      else if (row.openTime && row.closeTime) {
        const [ah, am] = row.openTime.split(':').map(Number),
          [bh, bm] = row.closeTime.split(':').map(Number);
        a.setHours(ah, am, 0, 0);
        b.setHours(bh, bm, 0, 0);
        if (row.closesNextDay) b.setDate(b.getDate() + 1);
      } else {
        day.setDate(day.getDate() + 1);
        continue;
      }
      windows.push({ from: +a, to: +b });
    }
    day.setDate(day.getDate() + 1);
  }
  windows.sort((a, b) => a.from - b.from);
  let covered = +from;
  for (const window of windows) {
    if (window.from > covered) break;
    covered = Math.max(covered, window.to);
    if (covered >= +to) return true;
  }
  return false;
}
