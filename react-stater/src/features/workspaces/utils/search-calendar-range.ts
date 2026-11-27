const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Include the following day so the last date still offers overnight hourly bookings. */
export function searchCalendarMonthRange(year: number, month: number, today: Date, maxDate: Date) {
  const first = new Date(year, month, 1);
  const next = new Date(year, month + 1, 1);
  const last = new Date(maxDate);
  last.setDate(last.getDate() + 1);
  return {
    from: isoDate(first < today ? today : first),
    to: isoDate(next > last ? last : next)
  };
}
