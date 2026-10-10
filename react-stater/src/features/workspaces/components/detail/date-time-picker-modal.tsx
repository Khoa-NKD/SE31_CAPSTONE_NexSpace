import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  TimerIcon,
  X
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

export interface ScheduleSelection {
  date: string;
  day: number;
  startTime: string;
  endTime: string;
  durationHours: number;
}

interface DateTimePickerModalProps {
  children?: React.ReactNode;
  initialDay?: number;
  initialStartTime?: string;
  initialEndTime?: string;
  onConfirm?: (schedule: ScheduleSelection) => void;
}

function parseHour(timeStr: string): number {
  const [time, modifier] = timeStr.split(' ');
  const parts = time.split(':');
  let hours = parseInt(parts[0], 10);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours;
}

function calculateDuration(start: string, end: string): number {
  const startH = parseHour(start);
  const endH = parseHour(end);
  const diff = endH - startH;
  return diff > 0 ? diff : 4;
}

export function DateTimePickerModal({
  children,
  initialDay = 25,
  initialStartTime = '09:00 AM',
  initialEndTime = '01:00 PM',
  onConfirm
}: DateTimePickerModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const durationHours = calculateDuration(startTime, endTime);
  const estimatedCost = (durationHours * 2.5).toFixed(2);

  const startOptions = [
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM'
  ];

  const endOptions = [
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '10:00 PM'
  ];

  const handleConfirm = () => {
    const formattedSchedule: ScheduleSelection = {
      date: `Jan ${selectedDay}, 2026`,
      day: selectedDay,
      startTime,
      endTime,
      durationHours
    };
    onConfirm?.(formattedSchedule);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className='bg-card border-border sm:max-w-[400px] w-[95vw] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden outline-none'>
        <div className='p-4 pb-3'>
          {/* Modal Header */}
          <div className='border-border/50 flex items-start justify-between border-b pb-3'>
            <div className='space-y-1'>
              <DialogTitle className='text-foreground font-sans text-[18px] font-bold tracking-tight'>
                Select Date &amp; Time
              </DialogTitle>
              <DialogDescription className='text-muted-foreground text-xs font-medium'>
                Choose your booking schedule for NexSpace Central Tower
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                aria-label='Close modal'
                className='text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 -mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95 duration-150 outline-none'
                type='button'
              >
                <X className='h-5 w-5' />
              </button>
            </DialogClose>
          </div>

          {/* Calendar Section */}
          <div className='pt-3 pb-3'>
            {/* Month Selector Header */}
            <div className='mb-2 flex items-center justify-between px-1'>
              <span className='text-foreground text-base font-semibold tracking-tight'>
                January 2026
              </span>
              <div className='flex items-center gap-1'>
                <button
                  aria-label='Previous month'
                  className='border-border hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors outline-none'
                  type='button'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                <button
                  aria-label='Next month'
                  className='border-border hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors outline-none'
                  type='button'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className='text-muted-foreground/70 border-border/50 mb-1.5 grid grid-cols-7 border-b py-1 text-center text-[11px] font-semibold tracking-wider'>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
              <span>SUN</span>
            </div>

            {/* 7-Column Dates Grid */}
            <div className='grid grid-cols-7 gap-1 text-center text-[13px] select-none'>
              {/* Week 1 (Past) */}
              <div className='text-muted-foreground/30 flex h-8 items-center justify-center cursor-not-allowed'>29</div>
              <div className='text-muted-foreground/30 flex h-8 items-center justify-center cursor-not-allowed'>30</div>
              <div className='text-muted-foreground/30 flex h-8 items-center justify-center cursor-not-allowed'>31</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>1</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>2</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>3</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>4</div>

              {/* Week 2 (Past) */}
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>5</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>6</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>7</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>8</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>9</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>10</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>11</div>

              {/* Week 3 (Past) */}
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>12</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>13</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>14</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>15</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>16</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>17</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>18</div>

              {/* Week 4 */}
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>19</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>20</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>21</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>22</div>
              <div className='text-muted-foreground/50 flex h-8 items-center justify-center cursor-not-allowed'>23</div>

              {/* Day 24 (Today) */}
              <button
                type='button'
                onClick={() => setSelectedDay(24)}
                className={`flex h-8 flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative ${
                  selectedDay === 24
                    ? 'bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20 scale-105'
                    : 'text-primary font-semibold hover:bg-primary/10'
                }`}
                title='Today'
              >
                <span>24</span>
                <span className={`w-1 h-1 rounded-full -mt-0.5 ${selectedDay === 24 ? 'bg-primary-foreground' : 'bg-primary'}`} />
              </button>

              {/* Day 25 */}
              <button
                type='button'
                onClick={() => setSelectedDay(25)}
                className={`flex h-8 items-center justify-center rounded-xl cursor-pointer transition-all ${
                  selectedDay === 25
                    ? 'bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20 scale-105'
                    : 'text-foreground font-medium hover:bg-primary/10 hover:text-primary'
                }`}
              >
                25
              </button>

              {/* Week 5 (Available dates) */}
              {[26, 27, 28, 29, 30, 31].map((day) => (
                <button
                  type='button'
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex h-8 items-center justify-center rounded-xl cursor-pointer transition-all ${
                    selectedDay === day
                      ? 'bg-primary text-primary-foreground font-bold shadow-md ring-4 ring-primary/20 scale-105'
                      : 'text-foreground font-medium hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {day}
                </button>
              ))}

              {/* Next month spillover */}
              <div className='text-muted-foreground/30 flex h-8 items-center justify-center cursor-not-allowed'>1</div>
            </div>

            {/* Calendar Micro Legend */}
            <div className='text-muted-foreground border-border/50 mt-1 flex items-center justify-between border-t px-2 pt-2 text-[11px] font-semibold'>
              <div className='flex items-center gap-1.5'>
                <span className='bg-primary h-2 w-2 rounded-full' />
                <span>Selected date</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='h-2 w-2 rounded-full bg-emerald-500' />
                <span>Peak desk availability (42 open)</span>
              </div>
            </div>
          </div>

          {/* Time Range Selection Section */}
          <div className='pt-1 pb-3'>
            <div className='mb-1.5 flex items-center justify-between'>
              <span className='text-muted-foreground font-mono text-[11px] font-semibold tracking-wider uppercase'>
                TIME SLOT (OPERATING HOURS: 08:00 AM – 10:00 PM)
              </span>
              <Clock className='text-muted-foreground h-4 w-4' />
            </div>

            {/* 2-Column Time Dropdown Grid */}
            <div className='grid grid-cols-2 gap-3'>
              {/* Start Time Select */}
              <div className='space-y-1'>
                <span className='text-foreground block text-xs font-medium'>Start Time</span>
                <div className='relative'>
                  <div className='bg-card border-border hover:border-primary flex h-10 items-center justify-between rounded-lg border px-3 transition-colors'>
                    <div className='flex items-center gap-2'>
                      <Clock className='text-muted-foreground h-4 w-4' />
                      <span className='text-foreground text-[13px] font-medium'>{startTime}</span>
                    </div>
                    <ChevronDown className='text-muted-foreground h-4 w-4 pointer-events-none' />
                  </div>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                    aria-label='Select start time'
                  >
                    {startOptions.map((opt) => (
                      <option key={opt} value={opt} className='bg-card text-foreground'>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* End Time Select */}
              <div className='space-y-1'>
                <span className='text-foreground block text-xs font-medium'>End Time</span>
                <div className='relative'>
                  <div className='bg-card border-border hover:border-primary flex h-10 items-center justify-between rounded-lg border px-3 transition-colors'>
                    <div className='flex items-center gap-2'>
                      <Clock className='text-muted-foreground h-4 w-4' />
                      <span className='text-foreground text-[13px] font-medium'>{endTime}</span>
                    </div>
                    <ChevronDown className='text-muted-foreground h-4 w-4 pointer-events-none' />
                  </div>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                    aria-label='Select end time'
                  >
                    {endOptions.map((opt) => (
                      <option key={opt} value={opt} className='bg-card text-foreground'>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Pill Summary */}
          <div className='flex flex-col items-center py-1.5'>
            <div className='bg-primary/10 border-primary/15 text-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold'>
              <TimerIcon className='h-[15px] w-[15px]' />
              <span>
                Total Duration: {durationHours} Hours ({durationHours >= 8 ? 'Full Day' : 'Half Day'})
              </span>
            </div>
            <p className='text-muted-foreground mt-1.5 text-center text-xs'>
              Rate: $2.50/hr • Estimated:{' '}
              <span className='text-foreground font-semibold'>${estimatedCost} USD</span>
            </p>
          </div>

          {/* Primary Action & Security Footer */}
          <div className='mt-2 pt-2'>
            <Button
              onClick={handleConfirm}
              className='text-primary-foreground flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-150 active:scale-[0.98]'
            >
              <span className='text-[13px] font-semibold'>Check Seat Availability</span>
              <ArrowRight className='h-[16px] w-[16px]' />
            </Button>
            <div className='text-muted-foreground/80 mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold'>
              <ShieldCheck className='h-[14px] w-[14px] text-emerald-600' />
              <span>No payment required at this step • Real-time 2D floor plan unlocks next</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
