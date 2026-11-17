import React from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BookingDto } from '@/features/workspaces/api/booking-types';

interface ScheduleMonthCalendarProps {
  currentDate: string; // YYYY-MM-DD
  bookings: BookingDto[];
  onSelectDate: (date: string) => void;
  onSwitchToDayView: () => void;
  totalResourcesCount: number;
}

export function ScheduleMonthCalendar({
  currentDate,
  bookings,
  onSelectDate,
  onSwitchToDayView,
  totalResourcesCount
}: ScheduleMonthCalendarProps) {
  // Parse year and month
  const activeDate = new Date(currentDate);
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Group bookings by date: YYYY-MM-DD -> BookingDto[]
  const bookingsByDate = React.useMemo(() => {
    const map = new Map<string, BookingDto[]>();
    for (const b of bookings) {
      if (b.startTime) {
        const d = b.startTime.slice(0, 10);
        const list = map.get(d) || [];
        list.push(b);
        map.set(d, list);
      }
    }
    return map;
  }, [bookings]);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingBefore = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4 select-none">
      {/* Month Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {monthNames[month]} {year} Overview
          </h2>
          <Badge variant="outline" className="text-xs font-semibold bg-muted/60">
            {bookings.length} Total Reservations
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Click on any date to inspect the daily Gantt timeline</span>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-1">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty padding cells for start of month */}
        {paddingBefore.map((padIdx) => (
          <div
            key={`pad-${padIdx}`}
            className="min-h-[96px] rounded-lg border border-border/40 bg-muted/10 opacity-40 pointer-events-none"
          />
        ))}

        {/* Days cells */}
        {daysArray.map((day) => {
          const formattedMonth = String(month + 1).padStart(2, '0');
          const formattedDay = String(day).padStart(2, '0');
          const dateString = `${year}-${formattedMonth}-${formattedDay}`;

          const dayBookings = bookingsByDate.get(dateString) || [];
          const isSelected = dateString === currentDate;

          const confirmedCount = dayBookings.filter((b) => b.status === 'CONFIRMED').length;
          const pendingCount = dayBookings.filter((b) => b.status === 'PENDING_PAYMENT').length;

          const occupancyPercent =
            totalResourcesCount > 0
              ? Math.min(100, Math.round((dayBookings.length / totalResourcesCount) * 100))
              : 0;

          return (
            <button
              type="button"
              key={dateString}
              onClick={() => {
                onSelectDate(dateString);
                onSwitchToDayView();
              }}
              className={`min-h-[96px] p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              {/* Day header row */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {day}
                </span>

                {dayBookings.length > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {occupancyPercent}% occ.
                  </span>
                )}
              </div>

              {/* Booking density indicators */}
              <div className="space-y-1 mt-1">
                {confirmedCount > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-sm">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{confirmedCount} Confirmed</span>
                  </div>
                )}

                {pendingCount > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-sm animate-pulse">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{pendingCount} Pending Hold</span>
                  </div>
                )}

                {dayBookings.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/60 italic block pt-1">
                    Available
                  </span>
                )}
              </div>

              {/* Bottom quick view button indicator on hover */}
              <div className="pt-1 text-[10px] text-primary font-medium opacity-0 hover:opacity-100 transition-opacity">
                Inspect timeline →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
