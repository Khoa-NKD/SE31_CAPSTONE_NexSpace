import { Calendar, List, LayoutGrid } from 'lucide-react';
import type { SeatCategory } from '../../types/seat';
import { DateTimePickerModal, type ScheduleSelection } from '../detail/date-time-picker-modal';

export type ScheduleInfo = ScheduleSelection;

interface SeatsFilterBarProps {
  selectedCategory: SeatCategory;
  onSelectCategory: (category: SeatCategory) => void;
  viewMode: 'list' | 'floor';
  onToggleView: (view: 'list' | 'floor') => void;
  counts: {
    all: number;
    hot_desk: number;
    dedicated_desk: number;
    meeting_pod: number;
  };
  schedule?: ScheduleInfo;
  onScheduleChange?: (newSchedule: ScheduleInfo) => void;
}

export function SeatsFilterBar({
  selectedCategory,
  onSelectCategory,
  viewMode,
  onToggleView,
  counts,
  schedule = {
    date: 'Jan 25, 2026',
    day: 25,
    startTime: '09:00 AM',
    endTime: '01:00 PM',
    durationHours: 4
  },
  onScheduleChange
}: SeatsFilterBarProps) {
  const categoryOptions: { key: SeatCategory; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'hot_desk', label: 'Hot Desks', count: counts.hot_desk },
    { key: 'dedicated_desk', label: 'Dedicated Desks', count: counts.dedicated_desk },
    { key: 'meeting_pod', label: 'Meeting Pods', count: counts.meeting_pod }
  ];

  return (
    <div className='bg-card border-border shadow-xs flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3.5 sm:p-4'>
      {/* Selected Slot Badge with Quick Change via DateTimePickerModal */}
      <DateTimePickerModal
        initialDay={schedule.day}
        initialStartTime={schedule.startTime}
        initialEndTime={schedule.endTime}
        onConfirm={onScheduleChange}
      >
        <button
          type='button'
          className='bg-primary/10 border-primary/20 hover:border-primary/50 hover:bg-primary/15 text-primary flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 sm:text-sm active:scale-95 group shadow-xs'
        >
          <Calendar className='h-4 w-4 shrink-0 transition-transform group-hover:scale-110' />
          <span>
            {schedule.date} • {schedule.startTime} - {schedule.endTime} ({schedule.durationHours} hrs)
          </span>
          <span className='ml-1 text-xs font-bold underline underline-offset-2 transition-colors group-hover:text-primary/80'>
            Change
          </span>
        </button>
      </DateTimePickerModal>

      {/* Quick Category Resource Filter Chips */}
      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0'>
        {categoryOptions.map((opt) => {
          const isActive = selectedCategory === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onSelectCategory(opt.key)}
              type='button'
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          );
        })}
      </div>

      {/* View Switcher Segmented Control */}
      <div className='bg-muted border-border/80 flex items-center rounded-lg border p-1'>
        <button
          onClick={() => onToggleView('list')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ${
            viewMode === 'list'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          type='button'
        >
          <List className='h-3.5 w-3.5' />
          <span>List View</span>
        </button>
        <button
          onClick={() => onToggleView('floor')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ${
            viewMode === 'floor'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          type='button'
        >
          <LayoutGrid className='h-3.5 w-3.5' />
          <span>2D Floor Plan</span>
        </button>
      </div>
    </div>
  );
}
