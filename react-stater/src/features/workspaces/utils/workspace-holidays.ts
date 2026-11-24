import type { PublicWorkspaceSummary } from '../api/types';
export const WORKSPACE_HOLIDAYS = [
  { code: 'NEW_YEAR', name: 'Tết Dương lịch' },
  { code: 'LUNAR_NEW_YEAR', name: 'Tết Nguyên đán' },
  { code: 'HUNG_KINGS', name: 'Giỗ Tổ Hùng Vương' },
  { code: 'REUNIFICATION', name: 'Ngày Chiến thắng' },
  { code: 'LABOUR_DAY', name: 'Quốc tế Lao động' },
  { code: 'NATIONAL_DAY', name: 'Quốc khánh' }
] as const;
export function holidayBookingError(
  workspace:
    | Pick<PublicWorkspaceSummary, 'holidayPeriods' | 'holidayCodes' | 'holidayCalendarThroughYear'>
    | null
    | undefined,
  start: string,
  end: string
) {
  const timestamp = (time: string) =>
    +new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(time) ? time : time + '+07:00');
  const from = timestamp(start),
    to = timestamp(end);
  for (const period of workspace?.holidayPeriods ?? [])
    if (from < +new Date(period.end + '+07:00') && to > +new Date(period.start + '+07:00'))
      return `Không gian nghỉ ${period.name} trong khoảng đã chọn.`;
  if (
    workspace?.holidayCodes?.some((code) =>
      ['LUNAR_NEW_YEAR', 'HUNG_KINGS', 'NATIONAL_DAY'].includes(code)
    ) &&
    workspace.holidayCalendarThroughYear &&
    new Date(to - 1).getFullYear() > workspace.holidayCalendarThroughYear
  )
    return 'Lịch nghỉ lễ của năm này chưa được cập nhật. Vui lòng chọn khoảng thời gian khác.';
  return null;
}
export const formatHolidayOpening = (time: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  }).format(new Date(time + '+07:00'));
