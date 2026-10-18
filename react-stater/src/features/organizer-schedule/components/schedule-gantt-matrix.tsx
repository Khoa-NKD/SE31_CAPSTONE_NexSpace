import React from 'react';
import {
  Laptop,
  Users,
  Presentation,
  PhoneCall,
  CheckCircle2,
  Clock,
  Wrench,
  Briefcase,
  UnfoldVertical,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GanttResource,
  GanttBookingBlock,
  ResourceCategoryType,
  GanttBlockType
} from '../types';
import {
  GANTT_START_HOUR,
  GANTT_TOTAL_HOURS,
  GANTT_TIMELINE_HOURS
} from '../data/mock-schedule';

interface ScheduleGanttMatrixProps {
  resources: GanttResource[];
  onSelectBlock: (resource: GanttResource, block: GanttBookingBlock) => void;
  onQuickBookSlot: (resource: GanttResource, startHour: number) => void;
}

// Module-scoped helper functions for clean scoping
function getResourceIcon(category: ResourceCategoryType) {
  switch (category) {
    case 'HOT_DESK':
      return <Laptop className="w-4 h-4 text-primary" />;
    case 'DEDICATED_DESK':
      return <Users className="w-4 h-4 text-amber-500" />;
    case 'BOOTH':
      return <PhoneCall className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    case 'MEETING_ROOM':
      return <Presentation className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    default:
      return <Laptop className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case 'OCCUPIED':
      return <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" title="Occupied Now" />;
    case 'SCHEDULED':
      return <span className="w-2 h-2 rounded-full border border-emerald-500 bg-emerald-500/20" title="Scheduled Later" />;
    case 'MAINTENANCE':
      return <span className="w-2 h-2 rounded-full bg-slate-400" title="Maintenance Mode" />;
    default:
      return <span className="w-2 h-2 rounded-full border border-border bg-card" title="Available" />;
  }
}

function getBlockStyle(type: GanttBlockType) {
  switch (type) {
    case 'CONFIRMED':
      return 'bg-indigo-600 dark:bg-indigo-700 text-white border-indigo-700 dark:border-indigo-600 shadow-xs hover:brightness-105';
    case 'PENDING':
      return 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs animate-pulse font-medium';
    case 'MAINTENANCE':
      return 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-600 border-dashed';
    case 'VIP':
      return 'bg-purple-600 dark:bg-purple-700 text-white border-purple-700 dark:border-purple-600 shadow-xs hover:brightness-105';
    default:
      return 'bg-card text-foreground border-border';
  }
}

function getBlockIcon(type: GanttBlockType) {
  switch (type) {
    case 'CONFIRMED':
      return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-200 shrink-0" />;
    case 'PENDING':
      return <Clock className="w-3.5 h-3.5 text-amber-950 shrink-0" />;
    case 'MAINTENANCE':
      return <Wrench className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />;
    case 'VIP':
      return <Briefcase className="w-3.5 h-3.5 text-purple-200 shrink-0" />;
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
}

export function ScheduleGanttMatrix({
  resources,
  onSelectBlock,
  onQuickBookSlot
}: ScheduleGanttMatrixProps) {
  // Current time marker: 11:45 AM
  // 11:45 is 3.75 hours from 08:00 out of 12 hours = (3.75 / 12) * 100% = 31.25%
  const currentTimePercentage = ((11.75 - GANTT_START_HOUR) / GANTT_TOTAL_HOURS) * 100;

  return (
    <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col select-none">
      <div className="overflow-x-auto relative">
        <div className="min-w-[1260px]">
          {/* ================= GANTT HEADER ROW ================= */}
          <div className="flex border-b border-border bg-muted/60 sticky top-0 z-20">
            {/* Sticky Left Resource Label Anchor */}
            <div className="w-[230px] shrink-0 px-4 py-3 bg-muted/80 border-r border-border font-bold text-xs text-muted-foreground tracking-wider uppercase flex items-center justify-between">
              <span>Resource / Node</span>
              <UnfoldVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
            </div>

            {/* Timeline Hours (08:00 - 20:00 -> 12 Hours) */}
            <div className="flex-1 grid grid-cols-12 relative text-center">
              {/* Red Vertical Line: Current Time Indicator (11:45 AM NOW) */}
              <div
                style={{ left: `${currentTimePercentage}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none flex flex-col items-center"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -mt-1 shadow-2xs" />
                <div className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap mt-1 uppercase font-bold tracking-tight">
                  11:45 AM NOW
                </div>
              </div>

              {GANTT_TIMELINE_HOURS.map((hr, idx) => {
                const isCurrentHour = hr === '11:00';
                return (
                  <div
                    key={hr}
                    className={`py-3 text-xs font-bold ${
                      idx !== GANTT_TIMELINE_HOURS.length - 1 ? 'border-r border-border' : ''
                    } ${
                      isCurrentHour
                        ? 'bg-primary/10 text-primary font-extrabold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {hr}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= GANTT BODY ================= */}
          <div className="relative divide-y divide-border">
            {/* Background Vertical Grid Columns */}
            <div className="absolute inset-0 left-[230px] grid grid-cols-12 pointer-events-none z-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`grid-col-${i}`}
                  className={`h-full ${i !== 11 ? 'border-r border-border/60' : ''} ${
                    i === 3 ? 'bg-primary/5' : ''
                  }`}
                />
              ))}
            </div>

            {/* Continuous Red Marker Line through Body */}
            <div
              style={{
                left: `calc(230px + ((100% - 230px) * ${currentTimePercentage / 100}))`
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-20 pointer-events-none"
            />

            {/* DATA ROWS */}
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex h-16 hover:bg-muted/30 transition-colors relative z-10 group"
              >
                {/* Left Resource Node Label */}
                <div className="w-[230px] shrink-0 px-4 bg-card border-r border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getResourceIcon(resource.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">
                        {resource.code}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {resource.zone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onQuickBookSlot(resource, 10)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      aria-label={`Book slot on ${resource.code}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    {getStatusDot(resource.status)}
                  </div>
                </div>

                {/* Timeline Slots Area */}
                <div className="flex-1 relative flex items-center px-1">
                  {/* Render Scheduled Blocks as Accessible Buttons */}
                  {resource.blocks.map((block) => {
                    const leftPercent =
                      ((block.startHour - GANTT_START_HOUR) / GANTT_TOTAL_HOURS) * 100;
                    const widthPercent =
                      ((block.endHour - block.startHour) / GANTT_TOTAL_HOURS) * 100;

                    return (
                      <button
                        key={block.id}
                        type="button"
                        aria-label={`View reservation: ${block.guestName} (${block.bookingCode})`}
                        style={{
                          left: `${Math.max(0, leftPercent)}%`,
                          width: `${Math.min(100 - leftPercent, widthPercent)}%`
                        }}
                        onClick={() => onSelectBlock(resource, block)}
                        className={`absolute h-11 rounded-lg p-2 text-left flex items-center justify-between border z-10 cursor-pointer transition-all active:scale-[0.99] ${getBlockStyle(
                          block.type
                        )}`}
                      >
                        <div className="truncate flex items-center gap-1.5 mr-2 min-w-0">
                          {getBlockIcon(block.type)}
                          <span className="text-xs font-semibold truncate">
                            {block.guestName} {block.bookingCode ? `(${block.bookingCode})` : ''}
                          </span>
                          {block.companyOrNote && (
                            <span className="text-[10px] opacity-80 hidden xl:inline truncate">
                              • {block.companyOrNote}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
                          {block.remainingTime || `${block.startTime} - ${block.endTime}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

