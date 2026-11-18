type DateValue = Date | string | number | null | undefined;

/** Calendar dates have no timezone. Construct them locally instead of treating ISO dates as UTC. */
function displayDate(value: DateValue): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const displayed = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (calendar || displayed) {
      const year = Number(calendar ? calendar[1] : displayed![3]);
      const month = Number(calendar ? calendar[2] : displayed![2]);
      const day = Number(calendar ? calendar[3] : displayed![1]);
      const date = new Date(0);
      date.setFullYear(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : undefined;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** All numeric calendar dates use day/month/year, in both UI languages. */
export function formatDate(value: DateValue, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = displayDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: opts.timeZone
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('day')}/${part('month')}/${part('year')}`;
}

export function formatDateTime(value: DateValue, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = displayDate(value);
  if (!date) return '';
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: opts.timeZone
  }).format(date);
  return `${formatDate(date, opts)} ${time}`;
}

/** Normalize existing display labels; relative labels and dates without a known year stay intact. */
export function formatDateLabel(value?: string | null): string {
  if (!value) return '';
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) return `${month[2]}/${month[1]}`;
  const iso =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      value
    );
  if (iso)
    return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}` : ''}${iso[5] ? (iso[5] === 'Z' ? ' UTC' : ` ${iso[5]}`) : ''}`;
  const english = /^([A-Za-z]+) (\d{1,2}), (\d{4})(.*)$/.exec(value);
  if (english) {
    const month =
      ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
        english[1].slice(0, 3).toLowerCase()
      ) + 1;
    if (month) {
      const date = formatDate(
        `${english[3]}-${String(month).padStart(2, '0')}-${english[2].padStart(2, '0')}`
      );
      if (date) return date + english[4];
    }
  }
  return value;
}

/** Validate a typed display value before emitting the canonical HTML/API value. */
export function parseDisplayDate(value: string, withTime = false): string | undefined {
  if (!value) return '';
  const match = (
    withTime ? /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/ : /^(\d{2})\/(\d{2})\/(\d{4})$/
  ).exec(value);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  const iso = `${year}-${month}-${day}`;
  if (formatDate(iso) !== `${day}/${month}/${year}`) return undefined;
  if (withTime && (Number(hour) > 23 || Number(minute) > 59)) return undefined;
  return withTime ? `${iso}T${hour}:${minute}` : iso;
}
