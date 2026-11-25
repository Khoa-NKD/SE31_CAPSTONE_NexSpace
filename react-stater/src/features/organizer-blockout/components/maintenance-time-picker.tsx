import { useEffect, useRef, useState } from 'react';
import { Clock, ChevronDown, Check } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { cn } from '@/lib/utils';
import {
  maintenanceChoiceIssue,
  maintenanceIssueText,
  maintenanceTimeChoices,
  type MaintenanceConflict
} from '../utils/maintenance-time';

function displayTime(time: string) {
  return time.length === 8 && time.endsWith(':00') ? time.slice(0, 5) : time;
}

export function MaintenanceTimePicker({
  label,
  day,
  value,
  boundary,
  start,
  conflicts,
  now,
  disabled,
  onChange,
  onOpen
}: {
  label: string;
  day: string;
  value: string;
  boundary: 'start' | 'end';
  start: string;
  conflicts: MaintenanceConflict[];
  now: number;
  disabled: boolean;
  onChange: (time: string) => void;
  onOpen: () => void;
}) {
  const c = useOrganizerCopy();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedOption = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) selectedOption.current?.scrollIntoView({ block: 'center' });
  }, [open]);
  const typed = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(search)
    ? search.length === 5
      ? search + ':00'
      : search
    : '';
  const options = maintenanceTimeChoices(day, conflicts, day + 'T' + (typed || value)).filter(
    (time) => !search || time.startsWith(search) || time === value
  );
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSearch('');
          onOpen();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled || !day}
          aria-label={label}
          className='h-11 w-full justify-start gap-2 bg-background text-sm font-normal tabular-nums'
        >
          <Clock className='size-4 text-muted-foreground' />
          <span className={cn('flex-1 text-left', !value && 'text-muted-foreground')}>
            {value ? displayTime(value) : c('Select time', 'Chọn giờ')}
          </span>
          <ChevronDown className='size-4 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-72 max-w-[calc(100vw-2rem)] p-3'>
        <p className='mb-2 text-sm font-semibold'>
          {label} <span className='font-normal text-muted-foreground'>(24h)</span>
        </p>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
          aria-label={c('Find or enter a time', 'Tìm hoặc nhập giờ')}
          placeholder={c('Type HH:mm, e.g. 09:15', 'Nhập HH:mm, ví dụ 09:15')}
          className='mb-2 h-9 tabular-nums'
        />
        <p className='mb-2 text-[11px] text-muted-foreground'>
          {c('Hover unavailable times for the reason.', 'Di chuột vào giờ bị khóa để xem lý do.')}
        </p>
        <TooltipProvider>
          <div
            className='grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain p-0.5'
            aria-label={label}
          >
            {options.map((time) => {
              const issue = maintenanceChoiceIssue(
                boundary,
                day + 'T' + time,
                start,
                conflicts,
                now
              );
              const reason = maintenanceIssueText(issue, c);
              return (
                <Tooltip key={time}>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      ref={time === value ? selectedOption : undefined}
                      aria-disabled={!!issue}
                      aria-pressed={time === value}
                      title={reason || undefined}
                      aria-label={reason ? `${displayTime(time)} · ${reason}` : displayTime(time)}
                      className={cn(
                        'flex min-h-10 items-center justify-between rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                        issue
                          ? 'cursor-not-allowed bg-muted/30 text-muted-foreground/55 line-through'
                          : 'hover:border-primary/50 hover:bg-primary/10',
                        time === value && !issue && 'border-primary bg-primary/15 text-primary'
                      )}
                      onClick={() => {
                        if (!issue) {
                          onChange(time);
                          setOpen(false);
                        }
                      }}
                    >
                      {displayTime(time)}
                      {time === value && !issue && <Check className='size-3.5' />}
                    </button>
                  </TooltipTrigger>
                  {issue && (
                    <TooltipContent className='max-w-72 leading-relaxed'>{reason}</TooltipContent>
                  )}
                </Tooltip>
              );
            })}
            {!options.length && (
              <p className='col-span-2 py-4 text-center text-xs text-muted-foreground'>
                {c('Use HH:mm, e.g. 09:15.', 'Nhập theo dạng HH:mm, ví dụ 09:15.')}
              </p>
            )}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
