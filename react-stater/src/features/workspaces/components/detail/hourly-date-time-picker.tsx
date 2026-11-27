import { useSearchCalendarQuery } from '../../api/queries';
import { hasSearchHourlyStart, searchHourlySlots } from '../../utils/search-hourly-slots';
import { searchCalendarMonthRange } from '../../utils/search-calendar-range';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useState, useId, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown,
  TimerIcon,
  AlertCircle,
  ArrowRight,
  CalendarDays
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { formatDate, parseDisplayDate } from '@/lib/format';
import { localTimestamp } from '../../utils/operating-hours';
import { hourlyTimestamp, hourlyTimeLabel } from '../../utils/hourly-picker';
import type { WorkspaceOperatingHour } from '../../api/types';
import type { ScheduleSelection, DateTimePickerModalProps } from './date-time-picker-modal';

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => 'Tháng ' + (index + 1));
const EMPTY_INTERVALS: import('../../utils/search-hourly-slots').SearchOperatingInterval[] = [];
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' ₫';
function initialMinutes(value: string | undefined, fallback: number) {
  const match = value
    ?.split('T')
    .pop()
    ?.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return fallback;
  const hour = match[3]
    ? (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0)
    : Number(match[1]);
  return hour * 60 + Number(match[2]) + (value?.includes('(+1 ngày)') ? 1440 : 0);
}
export function HourlyDateTimePicker(
  props: DateTimePickerModalProps & {
    hours: WorkspaceOperatingHour[];
    onConfirm: (value: ScheduleSelection) => void;
  }
) {
  const [now, setNow] = useState(() => new Date());
  const [validating, setValidating] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 90);
  const [selectedDate, setSelectedDate] = useState(() => {
    const raw =
      props.initialDate instanceof Date
        ? new Date(props.initialDate)
        : new Date(
            (parseDisplayDate(props.initialDate ?? '') ||
              props.initialDate?.slice(0, 10) ||
              localTimestamp(today).slice(0, 10)) + 'T00:00:00'
          );
    if (!props.initialDate && props.initialDay) raw.setDate(props.initialDay);
    raw.setHours(0, 0, 0, 0);
    return !Number.isFinite(+raw) || raw < today ? today : raw > maxDate ? maxDate : raw;
  });
  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());
  const [startTimeMinutes, setStartTimeMinutes] = useState(() =>
    initialMinutes(props.initialStartTime, 540)
  );
  const [endTimeMinutes, setEndTimeMinutes] = useState(() =>
    initialMinutes(props.initialEndTime, 780)
  );
  const startId = useId(),
    endId = useId();
  const searching = !props.workspaceId;
  const date = localTimestamp(selectedDate).slice(0, 10);
  const selectedMonthRange = searchCalendarMonthRange(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    today,
    maxDate
  );
  const viewedMonthRange = searchCalendarMonthRange(viewYear, viewMonth, today, maxDate);
  const sameMonth =
    selectedMonthRange.from === viewedMonthRange.from &&
    selectedMonthRange.to === viewedMonthRange.to;
  const calendar = useSearchCalendarQuery(
    {
      ...selectedMonthRange,
      workspaceId: props.workspaceId,
      ...props.searchFilters
    },
    true
  );
  const otherMonthCalendar = useSearchCalendarQuery(
    {
      ...viewedMonthRange,
      workspaceId: props.workspaceId,
      ...props.searchFilters
    },
    calendarOpen && !sameMonth
  );
  const monthCalendar = sameMonth ? calendar : otherMonthCalendar;
  const ready = !!calendar.data && !calendar.isError;
  const intervals = ready ? calendar.data!.intervals : EMPTY_INTERVALS;
  const options = useMemo(() => searchHourlySlots(date, intervals, now), [date, intervals, now]);
  const startTimeOptions = options.starts.map((minutes) => ({
    minutes,
    label: hourlyTimeLabel(minutes)
  }));
  const effectiveStartTimeMinutes = options.starts.includes(startTimeMinutes)
    ? startTimeMinutes
    : (options.starts[0] ?? 0);
  const endTimeOptions = (options.starts.length ? options.ends(effectiveStartTimeMinutes) : []).map(
    (minutes) => ({ minutes, label: hourlyTimeLabel(minutes) })
  );
  const effectiveEndTimeMinutes = endTimeOptions.some((option) => option.minutes === endTimeMinutes)
    ? endTimeMinutes
    : (endTimeOptions.find((option) => option.minutes === effectiveStartTimeMinutes + 120)
        ?.minutes ??
      endTimeOptions.at(-1)?.minutes ??
      0);
  const closeMinutes = endTimeOptions.at(-1)?.minutes ?? 0;
  const durationMinutes = Math.max(0, effectiveEndTimeMinutes - effectiveStartTimeMinutes);
  const durationHours = Math.round((durationMinutes / 60) * 100) / 100;
  const pricePerHour = props.pricePerHour ?? 0;
  const estimatedCost = (durationMinutes / 60) * pricePerHour;
  const isSelectedDateClosed = !options.starts.length;
  const isTodayExpired = +selectedDate === +today && !startTimeOptions.length;
  const row = props.hours.find((item) => item.dayOfWeek === (selectedDate.getDay() || 7));
  const status = calendar.isPending
    ? 'Đang tải khung giờ khả dụng…'
    : calendar.isError
      ? 'Chưa tải được lịch. Vui lòng thử lại.'
      : notice ||
        (!options.starts.length
          ? 'Không có chỗ khả dụng cho khung giờ còn lại trong ngày này. Vui lòng chọn ngày khác.'
          : '');
  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext =
    viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());
  function changeMonth(direction: number) {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }
  const handlePrevMonth = () => {
    if (canGoPrev) changeMonth(-1);
  };
  const handleNextMonth = () => {
    if (canGoNext) changeMonth(1);
  };
  const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const count = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cellCount = Math.ceil((offset + count) / 7) * 7;
  const monthReady = !!monthCalendar.data && !monthCalendar.isError;
  const monthIntervals = monthReady ? monthCalendar.data!.intervals : EMPTY_INTERVALS;
  const todayKey = localTimestamp(today).slice(0, 10);
  const maxDateKey = localTimestamp(maxDate).slice(0, 10);
  const calendarGrid = useMemo(
    () =>
      calendarOpen
        ? Array.from({ length: cellCount }, (_, index) => {
            const cellDate = new Date(viewYear, viewMonth, index - offset + 1);
            const day = localTimestamp(cellDate).slice(0, 10);
            const inRange = day >= todayKey && day <= maxDateKey;
            const inMonth = cellDate.getMonth() === viewMonth;
            const closed = monthReady && !hasSearchHourlyStart(day, monthIntervals, now);
            const available = monthReady && inRange && inMonth && !closed;
            return {
              key: day,
              dayNumber: cellDate.getDate(),
              date: cellDate,
              isCurrentMonth: inMonth,
              isClosed: closed,
              isToday: day === todayKey,
              isSelected: day === date,
              isDisabled: !available
            };
          })
        : [],
    [
      calendarOpen,
      cellCount,
      date,
      maxDateKey,
      monthIntervals,
      monthReady,
      now,
      offset,
      todayKey,
      viewMonth,
      viewYear
    ]
  );
  const applyPreset = (value: number | 'close') =>
    setEndTimeMinutes(
      value === 'close'
        ? closeMinutes
        : Math.min(effectiveStartTimeMinutes + value * 60, closeMinutes)
    );
  const valid =
    ready && !validating && !isSelectedDateClosed && !isTodayExpired && durationMinutes >= 30;
  async function confirm() {
    if (!valid) return;
    setValidating(true);
    setNotice('');
    try {
      const fresh = await calendar.refetch();
      if (fresh.error || !fresh.data) {
        setNotice('Chưa kiểm tra được lịch mới nhất. Vui lòng thử lại.');
        return;
      }
      const freshNow = new Date();
      const checked = searchHourlySlots(date, fresh.data.intervals, freshNow);
      const immediate =
        date === localTimestamp(now).slice(0, 10) &&
        effectiveStartTimeMinutes === now.getHours() * 60 + now.getMinutes();
      const actualStart = immediate
        ? freshNow.getHours() * 60 + freshNow.getMinutes()
        : effectiveStartTimeMinutes;
      const actualEnd = immediate
        ? checked
            .ends(actualStart)
            .find((value) => value >= Math.max(effectiveEndTimeMinutes, actualStart + 30))
        : checked.ends(actualStart).includes(effectiveEndTimeMinutes)
          ? effectiveEndTimeMinutes
          : undefined;
      if (!checked.starts.includes(actualStart) || actualEnd === undefined) {
        setNow(new Date());
        setNotice('Khung giờ vừa thay đổi hoặc đã kín chỗ. Vui lòng chọn lại.');
        return;
      }
      props.onConfirm({
        date: formatDate(selectedDate),
        day: selectedDate.getDate(),
        startTime: hourlyTimeLabel(actualStart),
        endTime: hourlyTimeLabel(actualEnd),
        durationHours: Math.round(((actualEnd - actualStart) / 60) * 100) / 100,
        isoDate: date,
        isoStartTime: hourlyTimestamp(date, actualStart),
        isoEndTime: hourlyTimestamp(date, actualEnd),
        priceType: 'HOURLY'
      });
    } finally {
      setValidating(false);
    }
  }
  return (
    <div>
      <div className='mb-2 space-y-1.5'>
        <p className='text-xs font-semibold'>Ngày đặt chỗ</p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='h-10 w-full justify-between rounded-lg text-sm font-normal'
              aria-label='Chọn ngày đặt chỗ'
            >
              <span>{formatDate(selectedDate)}</span>
              <CalendarDays className='size-4 text-primary' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className='w-[300px] max-w-[calc(100vw-2rem)] rounded-xl p-3'
          >
            {monthCalendar.isPending && (
              <p role='status' className='text-xs text-muted-foreground'>
                Đang tải ngày khả dụng…
              </p>
            )}
            {monthCalendar.isError && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void monthCalendar.refetch()}
              >
                Tải lại lịch
              </Button>
            )}
            <div className='pt-3 pb-2'>
              <div className='mb-2 flex items-center justify-between px-1'>
                <span className='text-foreground text-sm font-semibold tracking-tight'>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    onClick={handlePrevMonth}
                    disabled={!canGoPrev}
                    aria-label='Tháng trước'
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors outline-none ${
                      canGoPrev
                        ? 'border-border hover:bg-muted text-foreground cursor-pointer'
                        : 'border-border/40 text-muted-foreground/30 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={handleNextMonth}
                    disabled={!canGoNext}
                    aria-label='Tháng sau'
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors outline-none ${
                      canGoNext
                        ? 'border-border hover:bg-muted text-foreground cursor-pointer'
                        : 'border-border/40 text-muted-foreground/30 cursor-not-allowed'
                    }`}
                  >
                    <ChevronRight className='h-4 w-4' />
                  </button>
                </div>
              </div>

              <div className='text-muted-foreground/70 border-border/50 mb-1.5 grid grid-cols-7 border-b py-1 text-center text-[10px] font-semibold tracking-wider'>
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              <div className='grid grid-cols-7 gap-1 text-center text-xs select-none'>
                {calendarGrid.map((cell) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={cell.key}
                        className='text-muted-foreground/20 flex h-8 items-center justify-center cursor-not-allowed font-medium'
                      >
                        {cell.dayNumber}
                      </div>
                    );
                  }

                  if (cell.isDisabled) {
                    return (
                      <div
                        key={cell.key}
                        title={cell.isClosed ? 'Không có giờ đặt phù hợp' : 'Không khả dụng'}
                        className={`flex h-8 flex-col items-center justify-center rounded-lg cursor-not-allowed text-[11px] font-medium ${
                          cell.isClosed
                            ? 'text-rose-400/60 bg-rose-500/5 line-through'
                            : 'text-muted-foreground/30'
                        }`}
                      >
                        <span>{cell.dayNumber}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      type='button'
                      key={cell.key}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setCalendarOpen(false);
                      }}
                      className={`flex h-8 flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative text-xs ${
                        cell.isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm ring-2 ring-primary/30 scale-105'
                          : cell.isToday
                            ? 'border border-primary text-primary font-semibold hover:bg-primary/10'
                            : 'text-foreground font-medium hover:bg-muted hover:text-primary'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                      {cell.isToday && (
                        <span
                          className={`w-1 h-1 rounded-full -mt-0.5 ${
                            cell.isSelected ? 'bg-primary-foreground' : 'bg-primary'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className='text-muted-foreground border-border/40 mt-1 flex items-center justify-between border-t px-1 pt-1.5 text-[10px] font-medium'>
                <div className='flex items-center gap-1.5'>
                  <span className='bg-primary h-1.5 w-1.5 rounded-full' />
                  <span>Đã chọn</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='border border-primary h-1.5 w-1.5 rounded-full' />
                  <span>Hôm nay</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='h-1.5 w-1.5 rounded-full bg-rose-400' />
                  <span>Đóng cửa</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className='py-1.5'>
        {status ? (
          <p
            role='status'
            className='flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-muted-foreground'
          >
            <AlertCircle className='size-4 shrink-0' />
            {status}
          </p>
        ) : (
          <div className='flex items-center justify-between rounded-lg border bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <Clock className='size-3.5 text-primary' />
              {searching
                ? 'Khung giờ tìm kiếm'
                : row?.is24Hours
                  ? 'Mở cửa 24/7'
                  : row?.openTime && row?.closeTime
                    ? 'Giờ mở: ' + row.openTime.slice(0, 5) + ' – ' + row.closeTime.slice(0, 5)
                    : 'Chọn giờ sử dụng'}
            </span>
            <span>{formatDate(selectedDate)}</span>
          </div>
        )}
      </div>

      {!isSelectedDateClosed && !isTodayExpired && (
        <div className='space-y-2.5 pt-1 pb-2'>
          <div className='grid grid-cols-2 gap-2.5'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <label
                  htmlFor={startId}
                  className='text-foreground block text-[11px] font-semibold'
                >
                  Giờ bắt đầu
                </label>
              </div>
              <div className='relative'>
                <div className='bg-card border-border hover:border-primary flex h-9 items-center justify-between rounded-lg border px-2.5 transition-colors'>
                  <div className='flex items-center gap-1.5 overflow-hidden'>
                    <Clock className='text-primary h-3.5 w-3.5 shrink-0' />
                    <span className='text-foreground text-xs font-medium truncate'>
                      {hourlyTimeLabel(effectiveStartTimeMinutes)}
                    </span>
                  </div>
                  <ChevronDown className='text-muted-foreground h-3.5 w-3.5 shrink-0 pointer-events-none' />
                </div>
                <select
                  id={startId}
                  value={effectiveStartTimeMinutes}
                  onChange={(e) => {
                    const newStart = Number(e.target.value);
                    setStartTimeMinutes(newStart);
                    if (effectiveEndTimeMinutes <= newStart) {
                      setEndTimeMinutes(newStart + 60);
                    }
                  }}
                  className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                  aria-label='Chọn giờ bắt đầu'
                >
                  {startTimeOptions.map((opt) => (
                    <option
                      key={opt.minutes}
                      value={opt.minutes}
                      className='bg-card text-foreground'
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='space-y-1'>
              <label htmlFor={endId} className='text-foreground block text-[11px] font-semibold'>
                Giờ kết thúc
              </label>
              <div className='relative'>
                <div className='bg-card border-border hover:border-primary flex h-9 items-center justify-between rounded-lg border px-2.5 transition-colors'>
                  <div className='flex items-center gap-1.5 overflow-hidden'>
                    <Clock className='text-primary h-3.5 w-3.5 shrink-0' />
                    <span className='text-foreground text-xs font-medium truncate'>
                      {hourlyTimeLabel(effectiveEndTimeMinutes)}
                    </span>
                  </div>
                  <ChevronDown className='text-muted-foreground h-3.5 w-3.5 shrink-0 pointer-events-none' />
                </div>
                <select
                  id={endId}
                  value={effectiveEndTimeMinutes}
                  onChange={(e) => setEndTimeMinutes(Number(e.target.value))}
                  className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                  aria-label='Chọn giờ kết thúc'
                >
                  {endTimeOptions.map((opt) => (
                    <option
                      key={opt.minutes}
                      value={opt.minutes}
                      className='bg-card text-foreground'
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className='space-y-1'>
            <div className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
              Chọn nhanh
            </div>
            <div className='flex flex-wrap items-center gap-1.5'>
              {[
                { label: '1 giờ', hours: 1 },
                { label: '2 giờ', hours: 2 },
                { label: '4 giờ', hours: 4 },
                { label: '8 giờ', hours: 8 },
                { label: searching ? 'Hết ngày' : 'Đến giờ đóng', hours: 'close' as const }
              ].map((preset) => {
                const targetMinutes =
                  preset.hours === 'close'
                    ? closeMinutes
                    : effectiveStartTimeMinutes + preset.hours * 60;
                const isApplicable = endTimeOptions.some(
                  (option) => option.minutes === targetMinutes
                );
                const isActive = effectiveEndTimeMinutes === targetMinutes;

                return (
                  <button
                    key={preset.label}
                    type='button'
                    disabled={!isApplicable}
                    onClick={() => applyPreset(preset.hours)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                      !isApplicable
                        ? 'border-border/30 text-muted-foreground/30 cursor-not-allowed'
                        : isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!isSelectedDateClosed && !isTodayExpired && (
        <div className='flex flex-col items-center py-2 border-t border-border/50 mt-1'>
          <div className='bg-primary/10 border-primary/15 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold'>
            <TimerIcon className='h-3.5 w-3.5' />
            <span>Tổng thời gian: {durationHours} giờ </span>
          </div>
          {pricePerHour > 0 && (
            <p className='mt-1 text-center text-xs text-muted-foreground'>
              Đơn giá: {money(pricePerHour)}/giờ · Tạm tính:{' '}
              <span className='font-bold text-foreground'>{money(estimatedCost)}</span>
            </p>
          )}
        </div>
      )}

      {calendar.isError && (
        <Button
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => void calendar.refetch()}
        >
          Thử tải lại khung giờ
        </Button>
      )}
      <Button
        type='button'
        disabled={!valid}
        onClick={() => void confirm()}
        className='mt-2 h-10 w-full rounded-xl'
      >
        {validating ? 'Đang kiểm tra…' : 'Áp dụng thời gian'}
        <ArrowRight className='size-4' />
      </Button>
    </div>
  );
}
