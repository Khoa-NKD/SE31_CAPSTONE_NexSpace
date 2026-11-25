import type { WorkspaceHolidaySchedule } from '../api/types';

type HolidaySource = {
  holidayCodes?: string[];
  holidaySchedules?: WorkspaceHolidaySchedule[];
  holidayPeriods?: { code: string; start: string; end: string }[];
};

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

export function holidayScheduleError(
  codes: string[] = [],
  schedules: WorkspaceHolidaySchedule[] = []
) {
  if (new Set(schedules.map((item) => item.code)).size !== schedules.length) {
    return 'Mỗi dịp lễ chỉ được chọn một lịch nghỉ.';
  }
  if (codes.length !== schedules.length || schedules.some((item) => !codes.includes(item.code))) {
    return 'Chọn ngày nghỉ cho từng dịp lễ đã bật.';
  }
  if (schedules.some((item) => !validDate(item.startDate) || !validDate(item.endDate))) {
    return 'Nhập đủ ngày nghỉ hợp lệ cho từng dịp lễ đã chọn.';
  }
  if (schedules.some((item) => item.endDate < item.startDate)) {
    return 'Ngày kết thúc nghỉ lễ không được trước ngày bắt đầu.';
  }
  return null;
}

/** Legacy annual selections become explicit dates when the organizer reviews and saves them. */
export function hydrateHolidaySchedules(
  source: HolidaySource,
  today?: string
): WorkspaceHolidaySchedule[] {
  const localToday =
    today ??
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  return (source.holidayCodes ?? []).map((code) => {
    const custom = source.holidaySchedules?.find((item) => item.code === code);
    if (custom) return { ...custom };
    const periods = (source.holidayPeriods ?? [])
      .filter((period) => period.code === code)
      .sort((a, b) => a.start.localeCompare(b.start));
    const period = periods.find((item) => item.end.slice(0, 10) > localToday) ?? periods.at(-1);
    if (!period) return { code, startDate: '', endDate: '' };
    const lastDay = new Date(period.end.slice(0, 10) + 'T00:00:00Z');
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
    return {
      code,
      startDate: period.start.slice(0, 10),
      endDate: lastDay.toISOString().slice(0, 10)
    };
  });
}

export function formatHolidayDates(item: WorkspaceHolidaySchedule) {
  if (!validDate(item.startDate) || !validDate(item.endDate)) return 'Chưa chọn đủ ngày nghỉ';
  const display = (date: string) =>
    date.slice(8, 10) + '/' + date.slice(5, 7) + '/' + date.slice(0, 4);
  return item.startDate === item.endDate
    ? `Nghỉ 1 ngày · ${display(item.startDate)}`
    : `${display(item.startDate)} – ${display(item.endDate)}`;
}
