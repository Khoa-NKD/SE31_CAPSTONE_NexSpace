import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  TimerIcon,
  X,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WorkspaceOperatingHour } from '../../api/types';
import { usePublicOperatingHoursQuery } from '../../api/queries';

export interface ScheduleSelection {
  date: string;
  day: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  isoDate?: string;
  isoStartTime?: string;
  isoEndTime?: string;
}

export interface DateTimePickerModalProps {
  children?: React.ReactNode;
  workspaceId?: string | number;
  workspaceName?: string;
  operatingHours?: WorkspaceOperatingHour[];
  pricePerHour?: number;
  initialDate?: string | Date;
  initialDay?: number;
  initialStartTime?: string;
  initialEndTime?: string;
  onConfirm?: (schedule: ScheduleSelection) => void;
}

// Default operating hours (08:00 - 22:00 every day) if workspace does not specify
const DEFAULT_OPERATING_HOURS: WorkspaceOperatingHour[] = [1, 2, 3, 4, 5, 6, 7].map((day) => ({
  dayOfWeek: day,
  openTime: '08:00',
  closeTime: '22:00',
  isClosed: false,
  is24Hours: false
}));

/**
 * Parses time string (e.g. "09:00", "09:00 AM", "2026-11-12T09:00:00") into minutes from midnight.
 */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  // Check if ISO formatted timestamp
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return parseTimeToMinutes(timePart);
  }
  const ampmMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const modifier = ampmMatch[3]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

/**
 * Formats minutes from midnight into 12-hour format e.g. "09:00 AM".
 */
function minutesTo12Hour(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats minutes from midnight into 24-hour format e.g. "09:00:00".
 */
function minutesTo24Hour(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Formats Date into YYYY-MM-DD.
 */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function DateTimePickerModal({
  children,
  workspaceId,
  workspaceName = 'Workspace',
  operatingHours: propOperatingHours,
  pricePerHour = 2.5,
  initialDate,
  initialDay,
  initialStartTime,
  initialEndTime,
  onConfirm
}: DateTimePickerModalProps) {
  const [open, setOpen] = useState(false);

  // Fallback query if operatingHours are not passed via props but workspaceId is present
  const { data: queriedHours } = usePublicOperatingHoursQuery(
    propOperatingHours && propOperatingHours.length > 0 ? null : workspaceId
  );

  const effectiveHours = useMemo(() => {
    if (propOperatingHours && propOperatingHours.length > 0) return propOperatingHours;
    if (queriedHours && queriedHours.length > 0) return queriedHours;
    return DEFAULT_OPERATING_HOURS;
  }, [propOperatingHours, queriedHours]);

  // Today reference normalized to midnight
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Max selectable date: today + 90 days
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 90);
    return d;
  }, [today]);

  // Determine initial selected date
  const parseInitialDate = useCallback((): Date => {
    if (initialDate) {
      if (initialDate instanceof Date && !isNaN(initialDate.getTime())) {
        const d = new Date(initialDate);
        d.setHours(0, 0, 0, 0);
        return d >= today ? d : new Date(today);
      }
      if (typeof initialDate === 'string') {
        const parsed = new Date(initialDate);
        if (!isNaN(parsed.getTime())) {
          parsed.setHours(0, 0, 0, 0);
          return parsed >= today ? parsed : new Date(today);
        }
      }
    }
    if (initialDay && initialDay >= today.getDate()) {
      const d = new Date(today);
      d.setDate(initialDay);
      return d;
    }
    return new Date(today);
  }, [initialDate, initialDay, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(parseInitialDate);

  // Calendar month view state (year & month)
  const [viewYear, setViewYear] = useState<number>(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate.getMonth());

  // Time state stored as minutes from midnight
  const [startTimeMinutes, setStartTimeMinutes] = useState<number>(() => {
    if (initialStartTime) return parseTimeToMinutes(initialStartTime);
    return 9 * 60; // 09:00 AM
  });

  const [endTimeMinutes, setEndTimeMinutes] = useState<number>(() => {
    if (initialEndTime) return parseTimeToMinutes(initialEndTime);
    return 13 * 60; // 01:00 PM (4 hours duration)
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const parsed = parseInitialDate();
      setSelectedDate(parsed);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      if (initialStartTime) {
        setStartTimeMinutes(parseTimeToMinutes(initialStartTime));
      }
      if (initialEndTime) {
        setEndTimeMinutes(parseTimeToMinutes(initialEndTime));
      }
    }
  };

  // Navigation bounds
  const canGoPrev = useMemo(() => {
    return viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  }, [viewYear, viewMonth, today]);

  const canGoNext = useMemo(() => {
    return (
      viewYear < maxDate.getFullYear() || (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth())
    );
  }, [viewYear, viewMonth, maxDate]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Get operating hours for the currently selected date
  const selectedDayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
  const currentDayOperatingHour = useMemo(() => {
    const found = effectiveHours.find((h) => h.dayOfWeek === selectedDayOfWeek);
    return (
      found || {
        dayOfWeek: selectedDayOfWeek,
        openTime: '08:00',
        closeTime: '22:00',
        isClosed: false,
        is24Hours: false
      }
    );
  }, [effectiveHours, selectedDayOfWeek]);

  const isSelectedDateClosed = Boolean(currentDayOperatingHour?.isClosed);
  const openMinutes = useMemo(() => {
    if (currentDayOperatingHour.is24Hours) return 0;
    return parseTimeToMinutes(currentDayOperatingHour.openTime || '08:00');
  }, [currentDayOperatingHour]);

  const closeMinutes = useMemo(() => {
    if (currentDayOperatingHour.is24Hours) return 1440;
    return parseTimeToMinutes(currentDayOperatingHour.closeTime || '22:00');
  }, [currentDayOperatingHour]);

  // Is selected date today?
  const isSelectedDateToday = selectedDate.getTime() === today.getTime();

  // Current time + 15 min buffer if today
  const nowMinutesWithBuffer = useMemo(() => {
    if (!isSelectedDateToday) return 0;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + 15;
  }, [isSelectedDateToday]);

  // Generate available start time options (30-min increments)
  const startTimeOptions = useMemo(() => {
    if (isSelectedDateClosed) return [];
    const options: { minutes: number; label: string }[] = [];
    const minStart = isSelectedDateToday
      ? Math.max(openMinutes, Math.ceil(nowMinutesWithBuffer / 30) * 30)
      : openMinutes;

    const maxStart = closeMinutes - 30; // Must leave at least 30 min before close

    for (let m = minStart; m <= maxStart; m += 30) {
      options.push({
        minutes: m,
        label: minutesTo12Hour(m)
      });
    }
    return options;
  }, [isSelectedDateClosed, isSelectedDateToday, openMinutes, closeMinutes, nowMinutesWithBuffer]);

  // Check if today has already expired
  const isTodayExpired = isSelectedDateToday && startTimeOptions.length === 0;

  // Selected or first available start time
  const effectiveStartTimeMinutes = useMemo(() => {
    if (startTimeOptions.length === 0) return 0;
    const exists = startTimeOptions.some((opt) => opt.minutes === startTimeMinutes);
    return exists ? startTimeMinutes : startTimeOptions[0].minutes;
  }, [startTimeOptions, startTimeMinutes]);

  // Generate available end time options based on current effective start time
  const endTimeOptions = useMemo(() => {
    if (isSelectedDateClosed || startTimeOptions.length === 0) return [];
    const options: { minutes: number; label: string }[] = [];
    const minEnd = effectiveStartTimeMinutes + 30;
    const maxEnd = closeMinutes;

    for (let m = minEnd; m <= maxEnd; m += 30) {
      options.push({
        minutes: m,
        label: minutesTo12Hour(m)
      });
    }
    return options;
  }, [isSelectedDateClosed, startTimeOptions.length, effectiveStartTimeMinutes, closeMinutes]);

  // Selected or preferred end time
  const effectiveEndTimeMinutes = useMemo(() => {
    if (endTimeOptions.length === 0) return 0;
    const exists = endTimeOptions.some((opt) => opt.minutes === endTimeMinutes);
    if (exists) return endTimeMinutes;
    const preferred = effectiveStartTimeMinutes + 120;
    const matching = endTimeOptions.find((opt) => opt.minutes === preferred);
    return matching ? matching.minutes : endTimeOptions[endTimeOptions.length - 1].minutes;
  }, [endTimeOptions, endTimeMinutes, effectiveStartTimeMinutes]);

  // Handle preset duration clicks (e.g. 1h, 2h, 4h, 8h, Until Close)
  const applyPreset = (presetHours: number | 'close') => {
    if (presetHours === 'close') {
      setEndTimeMinutes(closeMinutes);
      return;
    }
    const target = effectiveStartTimeMinutes + presetHours * 60;
    if (target <= closeMinutes) {
      setEndTimeMinutes(target);
    } else {
      setEndTimeMinutes(closeMinutes);
    }
  };

  // Total duration calculation
  const durationMinutes = Math.max(0, effectiveEndTimeMinutes - effectiveStartTimeMinutes);
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const estimatedCost = (durationHours * pricePerHour).toFixed(2);

  // Calendar days grid computation
  const calendarGrid = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    // Monday as 0, Sunday as 6
    const startingOffset = (firstDayIndex + 6) % 7;

    const cells: {
      key: string;
      dayNumber: number;
      date: Date;
      isCurrentMonth: boolean;
      isPast: boolean;
      isAfterMax: boolean;
      isToday: boolean;
      isClosed: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    // Leading days from previous month
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      prevDate.setHours(0, 0, 0, 0);
      cells.push({
        key: `prev-${dayNum}`,
        dayNumber: dayNum,
        date: prevDate,
        isCurrentMonth: false,
        isPast: true,
        isAfterMax: false,
        isToday: false,
        isClosed: false,
        isSelected: false,
        isDisabled: true
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const cellDate = new Date(viewYear, viewMonth, d);
      cellDate.setHours(0, 0, 0, 0);

      const isPast = cellDate.getTime() < today.getTime();
      const isAfterMax = cellDate.getTime() > maxDate.getTime();
      const isToday = cellDate.getTime() === today.getTime();
      const dayOfWeek = cellDate.getDay() === 0 ? 7 : cellDate.getDay();
      const opHour = effectiveHours.find((h) => h.dayOfWeek === dayOfWeek);
      const isClosed = !opHour || Boolean(opHour.isClosed);
      const isSelected = cellDate.getTime() === selectedDate.getTime();
      const isDisabled = isPast || isAfterMax || isClosed;

      cells.push({
        key: `curr-${d}`,
        dayNumber: d,
        date: cellDate,
        isCurrentMonth: true,
        isPast,
        isAfterMax,
        isToday,
        isClosed,
        isSelected,
        isDisabled
      });
    }

    // Trailing days from next month to complete 7-day row
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainder; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      nextDate.setHours(0, 0, 0, 0);
      cells.push({
        key: `next-${d}`,
        dayNumber: d,
        date: nextDate,
        isCurrentMonth: false,
        isPast: false,
        isAfterMax: true,
        isToday: false,
        isClosed: false,
        isSelected: false,
        isDisabled: true
      });
    }

    return cells;
  }, [viewYear, viewMonth, today, maxDate, effectiveHours, selectedDate]);

  // Submission handler
  const handleConfirm = () => {
    if (isSelectedDateClosed || isTodayExpired || durationMinutes <= 0) return;

    const isoDate = toIsoDate(selectedDate);
    const isoStartTime = `${isoDate}T${minutesTo24Hour(effectiveStartTimeMinutes)}`;
    const isoEndTime = `${isoDate}T${minutesTo24Hour(effectiveEndTimeMinutes)}`;

    const monthAbbr = MONTH_NAMES[selectedDate.getMonth()].slice(0, 3);
    const dateFormatted = `${monthAbbr} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

    const formattedSchedule: ScheduleSelection = {
      date: dateFormatted,
      day: selectedDate.getDate(),
      startTime: minutesTo12Hour(effectiveStartTimeMinutes),
      endTime: minutesTo12Hour(effectiveEndTimeMinutes),
      durationHours,
      isoDate,
      isoStartTime,
      isoEndTime
    };

    onConfirm?.(formattedSchedule);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className='bg-card border-border sm:max-w-[420px] w-[95vw] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden outline-none'>
        <div className='p-4 pb-3'>
          {/* Modal Header */}
          <div className='border-border/50 flex items-start justify-between border-b pb-3'>
            <div className='space-y-1'>
              <DialogTitle className='text-foreground font-sans text-lg font-bold tracking-tight'>
                Select Date &amp; Time
              </DialogTitle>
              <DialogDescription className='text-muted-foreground text-xs font-medium'>
                Choose your schedule for {workspaceName}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                aria-label='Close modal'
                className='text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 -mt-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95 duration-150 outline-none'
                type='button'
              >
                <X className='h-4 w-4' />
              </button>
            </DialogClose>
          </div>

          {/* Dynamic Calendar Section */}
          <div className='pt-3 pb-2'>
            {/* Month Navigation */}
            <div className='mb-2 flex items-center justify-between px-1'>
              <span className='text-foreground text-sm font-semibold tracking-tight'>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  onClick={handlePrevMonth}
                  disabled={!canGoPrev}
                  aria-label='Previous month'
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
                  aria-label='Next month'
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

            {/* Days of Week Header */}
            <div className='text-muted-foreground/70 border-border/50 mb-1.5 grid grid-cols-7 border-b py-1 text-center text-[10px] font-semibold tracking-wider'>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
              <span>SUN</span>
            </div>

            {/* Calendar Grid */}
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
                      title={cell.isClosed ? 'Closed on this day' : 'Not available'}
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
                    onClick={() => setSelectedDate(cell.date)}
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

            {/* Calendar Micro Legend */}
            <div className='text-muted-foreground border-border/40 mt-1 flex items-center justify-between border-t px-1 pt-1.5 text-[10px] font-medium'>
              <div className='flex items-center gap-1.5'>
                <span className='bg-primary h-1.5 w-1.5 rounded-full' />
                <span>Selected</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='border border-primary h-1.5 w-1.5 rounded-full' />
                <span>Today</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='h-1.5 w-1.5 rounded-full bg-rose-400' />
                <span>Closed</span>
              </div>
            </div>
          </div>

          {/* Operating Hours Alert / Info Banner */}
          <div className='py-1.5'>
            {isSelectedDateClosed ? (
              <div className='bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 rounded-lg border p-2 text-xs font-medium'>
                <AlertCircle className='h-4 w-4 shrink-0' />
                <span>This workspace is closed on {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}. Please select another day.</span>
              </div>
            ) : isTodayExpired ? (
              <div className='bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-2 rounded-lg border p-2 text-xs font-medium'>
                <AlertCircle className='h-4 w-4 shrink-0' />
                <span>Operating hours for today have passed. Please select a future date.</span>
              </div>
            ) : (
              <div className='bg-muted/60 border-border/50 text-muted-foreground flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] font-medium'>
                <div className='flex items-center gap-1.5'>
                  <Clock className='text-primary h-3.5 w-3.5' />
                  <span>
                    Hours: {minutesTo12Hour(openMinutes)} – {minutesTo12Hour(closeMinutes)}
                  </span>
                </div>
                <span className='text-[10px] text-muted-foreground/80'>
                  {MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} {selectedDate.getDate()}
                </span>
              </div>
            )}
          </div>

          {/* Time Slot Pickers (Disabled if closed or expired) */}
          {!isSelectedDateClosed && !isTodayExpired && (
            <div className='space-y-2.5 pt-1 pb-2'>
              <div className='grid grid-cols-2 gap-2.5'>
                {/* Start Time Dropdown */}
                <div className='space-y-1'>
                  <label htmlFor='start-time-select' className='text-foreground block text-[11px] font-semibold'>
                    Start Time
                  </label>
                  <div className='relative'>
                    <div className='bg-card border-border hover:border-primary flex h-9 items-center justify-between rounded-lg border px-2.5 transition-colors'>
                      <div className='flex items-center gap-1.5 overflow-hidden'>
                        <Clock className='text-primary h-3.5 w-3.5 shrink-0' />
                        <span className='text-foreground text-xs font-medium truncate'>
                          {minutesTo12Hour(effectiveStartTimeMinutes)}
                        </span>
                      </div>
                      <ChevronDown className='text-muted-foreground h-3.5 w-3.5 shrink-0 pointer-events-none' />
                    </div>
                    <select
                      id='start-time-select'
                      value={effectiveStartTimeMinutes}
                      onChange={(e) => {
                        const newStart = Number(e.target.value);
                        setStartTimeMinutes(newStart);
                        if (effectiveEndTimeMinutes <= newStart) {
                          setEndTimeMinutes(newStart + 60);
                        }
                      }}
                      className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                      aria-label='Select start time'
                    >
                      {startTimeOptions.map((opt) => (
                        <option key={opt.minutes} value={opt.minutes} className='bg-card text-foreground'>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Time Dropdown */}
                <div className='space-y-1'>
                  <label htmlFor='end-time-select' className='text-foreground block text-[11px] font-semibold'>
                    End Time
                  </label>
                  <div className='relative'>
                    <div className='bg-card border-border hover:border-primary flex h-9 items-center justify-between rounded-lg border px-2.5 transition-colors'>
                      <div className='flex items-center gap-1.5 overflow-hidden'>
                        <Clock className='text-primary h-3.5 w-3.5 shrink-0' />
                        <span className='text-foreground text-xs font-medium truncate'>
                          {minutesTo12Hour(effectiveEndTimeMinutes)}
                        </span>
                      </div>
                      <ChevronDown className='text-muted-foreground h-3.5 w-3.5 shrink-0 pointer-events-none' />
                    </div>
                    <select
                      id='end-time-select'
                      value={effectiveEndTimeMinutes}
                      onChange={(e) => setEndTimeMinutes(Number(e.target.value))}
                      className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                      aria-label='Select end time'
                    >
                      {endTimeOptions.map((opt) => (
                        <option key={opt.minutes} value={opt.minutes} className='bg-card text-foreground'>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Preset Duration Chips */}
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
                  Quick Presets
                </div>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {[
                    { label: '1 Hour', hours: 1 },
                    { label: '2 Hours', hours: 2 },
                    { label: '4 Hours', hours: 4 },
                    { label: '8 Hours', hours: 8 },
                    { label: 'Until Close', hours: 'close' as const }
                  ].map((preset) => {
                    const targetMinutes =
                      preset.hours === 'close'
                        ? closeMinutes
                        : effectiveStartTimeMinutes + preset.hours * 60;
                    const isApplicable = targetMinutes <= closeMinutes && effectiveStartTimeMinutes < closeMinutes;
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

          {/* Duration & Price Summary */}
          {!isSelectedDateClosed && !isTodayExpired && (
            <div className='flex flex-col items-center py-2 border-t border-border/50 mt-1'>
              <div className='bg-primary/10 border-primary/15 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold'>
                <TimerIcon className='h-3.5 w-3.5' />
                <span>
                  Total: {durationHours} Hour{durationHours !== 1 ? 's' : ''}{' '}
                  {durationHours >= 8 ? '(Full Day)' : durationHours >= 4 ? '(Half Day)' : ''}
                </span>
              </div>
              <p className='text-muted-foreground mt-1 text-center text-xs'>
                Rate: ${pricePerHour.toFixed(2)}/hr • Subtotal:{' '}
                <span className='text-foreground font-bold'>${estimatedCost} USD</span>
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className='mt-1 pt-1'>
            <Button
              type='button'
              disabled={isSelectedDateClosed || isTodayExpired || durationMinutes <= 0}
              onClick={handleConfirm}
              className='text-primary-foreground flex h-9.5 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-all duration-150 active:scale-[0.98]'
            >
              <span className='text-xs'>Confirm Schedule</span>
              <ArrowRight className='h-4 w-4' />
            </Button>
            <div className='text-muted-foreground/80 mt-1.5 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium'>
              <ShieldCheck className='h-3.5 w-3.5 text-emerald-600' />
              <span>Free cancellation up to 2 hours prior • Floor map syncs next</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
