import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  Info,
  Download,
  Lock,
  Wrench,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  BlockoutEvent,
  BlockoutTargetResource,
  CalendarViewMode
} from '../types';

interface BlockoutCalendarMatrixProps {
  events: BlockoutEvent[];
  selectedResourceId: string;
  onSelectResource: (id: string) => void;
  availableResources: BlockoutTargetResource[];
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onExportSchedule: () => void;
  onSlotClick?: (event: BlockoutEvent) => void;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const DAYS_HEADER = [
  { day: 'Mon', date: '20', isToday: false, isSpecial: false },
  { day: 'Tue', date: '21', isToday: false, isSpecial: false },
  { day: 'Wed', date: '22', isToday: false, isSpecial: false },
  { day: 'Thu', date: '23', isToday: false, isSpecial: false },
  { day: 'Fri', date: '24', isToday: true, isSpecial: true },
  { day: 'Sat', date: '25', isToday: false, isSpecial: false },
  { day: 'Sun', date: '26', isToday: false, isSpecial: false }
];

export function BlockoutCalendarMatrix({
  events,
  selectedResourceId,
  onSelectResource,
  availableResources,
  viewMode,
  onViewModeChange,
  onExportSchedule,
  onSlotClick
}: BlockoutCalendarMatrixProps) {
  return (
    <section className="flex flex-col bg-card rounded-xl border border-border shadow-xs overflow-hidden select-none">
      {/* 1. Matrix Control Header */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card">
        {/* Week Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous week"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-none border-r border-border"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              type="button"
              className="px-3 h-8 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Today
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next week"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-none border-l border-border"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight whitespace-nowrap">
            Jan 20 – Jan 26, 2026
          </h2>
        </div>

        {/* Resource Selector Dropdown & View Mode Segmented Control */}
        <div className="flex items-center gap-3">
          {/* Resource Selector */}
          <div className="w-56 sm:w-64">
            <Select value={selectedResourceId} onValueChange={onSelectResource}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <div className="flex items-center gap-1.5 truncate">
                  <DoorClosed className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Select Resource" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Floor Resources</SelectItem>
                {availableResources.map((res) => (
                  <SelectItem key={res.id} value={res.id}>
                    {res.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Switcher */}
          <div className="flex items-center p-0.5 bg-muted rounded-lg border border-border text-xs shrink-0">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`capitalize px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-background text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Color Coding & Pattern Legend */}
      <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex flex-wrap items-center gap-5 text-xs">
        <span className="text-muted-foreground font-medium">Schedule Legend:</span>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-primary/10 border-l-2 border-primary" />
          <span className="text-foreground font-medium">Confirmed Bookings</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded border border-slate-700 shadow-2xs"
            style={{
              backgroundColor: '#1e293b',
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(51, 65, 85, 0.9), rgba(51, 65, 85, 0.9) 3px, rgba(30, 41, 59, 0.95) 3px, rgba(30, 41, 59, 0.95) 6px)'
            }}
          />
          <span className="text-foreground font-medium">Blocked Maintenance / Downtime</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded border border-amber-800 shadow-2xs"
            style={{
              backgroundColor: '#78350f',
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(180, 83, 9, 0.9), rgba(180, 83, 9, 0.9) 3px, rgba(120, 53, 15, 0.95) 3px, rgba(120, 53, 15, 0.95) 6px)'
            }}
          />
          <span className="text-foreground font-medium">Private Event Hold</span>
        </div>
      </div>

      {/* 3. Calendar Matrix Timetable View */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Days of the Week Column Headers */}
          <div className="grid grid-cols-8 border-b border-border bg-muted/30 text-xs font-semibold">
            <div className="py-2.5 px-3 text-muted-foreground text-right font-medium border-r border-border">
              Time
            </div>
            {DAYS_HEADER.map((d) => (
              <div
                key={d.day}
                className={`py-2.5 px-2 text-center border-r border-border last:border-r-0 ${
                  d.isSpecial ? 'bg-primary/5 text-primary' : 'text-foreground'
                }`}
              >
                <span>{d.day}</span>{' '}
                <span
                  className={
                    d.isToday
                      ? 'font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px]'
                      : 'font-normal text-muted-foreground'
                  }
                >
                  {d.date}
                </span>
              </div>
            ))}
          </div>

          {/* Time Grid Canvas with Relative Positioned Reservations and Blockouts */}
          <div className="relative grid grid-cols-8 bg-card" style={{ height: '576px' }}>
            {/* Column 0: Time Column Axis */}
            <div className="flex flex-col border-r border-border select-none">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-12 border-b border-border/50 px-3 pt-1 text-right font-mono text-[11px] text-muted-foreground"
                >
                  {h.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Columns 1-7: Days (0 = Mon to 6 = Sun) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const dayEvents = events.filter((e) => e.dayOfWeek === dayIndex);
              const isFriday = dayIndex === 4;

              return (
                <div
                  key={dayIndex}
                  className={`relative border-r border-border/50 last:border-r-0 ${
                    isFriday ? 'bg-primary/[0.02]' : ''
                  }`}
                >
                  {/* Grid Lines for each hour */}
                  {HOURS.map((h) => (
                    <div key={h} className="h-12 border-b border-border/40" />
                  ))}

                  {/* Render Day's Events */}
                  {dayEvents.map((slot) => {
                    const top = (slot.startHour - 8) * 48;
                    const height = slot.durationHours * 48;

                    // Slot Type 1: Confirmed Booking (Indigo / Blue card)
                    if (slot.type === 'CONFIRMED_BOOKING') {
                      return (
                        <div
                          key={slot.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSlotClick?.(slot)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onSlotClick?.(slot);
                          }}
                          aria-label={`Booking ${slot.title} from ${slot.startTimeDisplay} to ${slot.endTimeDisplay}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                          className="absolute left-1 right-1 bg-primary/10 border-l-4 border-primary text-foreground p-2 rounded-r-md shadow-2xs text-left z-10 overflow-hidden flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-primary font-bold">
                                {slot.startTimeDisplay} - {slot.endTimeDisplay}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <p className="text-xs font-semibold leading-snug text-foreground mt-1 line-clamp-1">
                              {slot.title}
                            </p>
                            {slot.subtitle && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {slot.subtitle}
                              </p>
                            )}
                          </div>
                          {slot.tag && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-medium text-foreground border border-border w-max">
                              {slot.tag}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Slot Type 2: Maintenance Downtime (Hatched Slate)
                    if (slot.type === 'MAINTENANCE_DOWNTIME') {
                      return (
                        <div
                          key={slot.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSlotClick?.(slot)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onSlotClick?.(slot);
                          }}
                          aria-label={`Maintenance block ${slot.title} from ${slot.startTimeDisplay} to ${slot.endTimeDisplay}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: '#1e293b',
                            backgroundImage:
                              'repeating-linear-gradient(-45deg, rgba(51, 65, 85, 0.9), rgba(51, 65, 85, 0.9) 8px, rgba(30, 41, 59, 0.95) 8px, rgba(30, 41, 59, 0.95) 16px)'
                          }}
                          className="absolute left-1 right-1 text-white p-2.5 rounded-lg shadow-md border-2 border-slate-700 z-10 flex flex-col justify-between overflow-hidden ring-2 ring-rose-500/20 hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-bold border border-rose-800">
                                <Lock className="w-2.5 h-2.5" />
                                <span>DOWNTIME</span>
                              </span>
                              <span className="text-[10px] text-slate-300 font-mono">
                                {slot.startTimeDisplay} - {slot.endTimeDisplay}
                              </span>
                            </div>

                            <div className="mt-2">
                              <p className="text-xs leading-tight font-bold text-white flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-rose-400" />
                                <span>{slot.title}</span>
                              </p>
                              {slot.subtitle && (
                                <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                                  {slot.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                              {slot.attendeesOrTeam}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                              {slot.durationHours.toFixed(1)} hrs
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Slot Type 3: Private Event (Hatched Amber)
                    if (slot.type === 'PRIVATE_EVENT') {
                      return (
                        <div
                          key={slot.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSlotClick?.(slot)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onSlotClick?.(slot);
                          }}
                          aria-label={`Private event block ${slot.title} from ${slot.startTimeDisplay} to ${slot.endTimeDisplay}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: '#78350f',
                            backgroundImage:
                              'repeating-linear-gradient(-45deg, rgba(180, 83, 9, 0.9), rgba(180, 83, 9, 0.9) 8px, rgba(120, 53, 15, 0.95) 8px, rgba(120, 53, 15, 0.95) 16px)'
                          }}
                          className="absolute left-1 right-1 text-white p-2.5 rounded-lg shadow-md border-2 border-amber-700 z-10 flex flex-col justify-between overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 text-[10px] font-bold border border-amber-700">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>RESERVED</span>
                              </span>
                              <span className="text-[10px] text-amber-100 font-mono">
                                {slot.startTimeDisplay} - {slot.endTimeDisplay}
                              </span>
                            </div>

                            <div className="mt-1.5">
                              <p className="text-xs leading-tight font-bold text-white line-clamp-1">
                                {slot.title}
                              </p>
                              {slot.subtitle && (
                                <p className="text-[10px] text-amber-200 mt-0.5 line-clamp-1">
                                  {slot.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-amber-700/80 flex items-center justify-between">
                            <span className="text-[10px] text-amber-200 truncate max-w-[90px]">
                              {slot.attendeesOrTeam}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-900/80 text-[10px] text-amber-100 font-mono">
                              {slot.durationHours.toFixed(1)} hrs
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              );
            })}

            {/* Current Simulated Live Time Indicator Line (e.g. 11:15 AM on Friday) */}
            <div className="absolute left-[12.5%] right-0 top-[156px] flex items-center pointer-events-none z-20">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1" />
              <div className="h-0.5 w-full bg-rose-500 shadow-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Calendar Footer Information Ribbon */}
      <div className="p-3.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>All times configured in Indochina Time Zone (UTC+07:00 Ho Chi Minh).</span>
        </div>

        <button
          type="button"
          onClick={onExportSchedule}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Weekly Schedule (ICS)</span>
        </button>
      </div>
    </section>
  );
}

