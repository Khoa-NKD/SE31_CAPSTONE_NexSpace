import * as React from 'react';
import { CalendarDays } from '@/components/ui/hugeicons';
import { Input } from './input';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { formatDate, formatDateTime, parseDisplayDate } from '@/lib/format';

type DateInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> & {
  type?: 'date' | 'datetime-local';
  value?: string;
  min?: string;
  max?: string;
  onValueChange?: (value: string) => void;
};

/** Show a stable display format while keeping canonical date values in forms and API callbacks. */
export function DateInput({
  type = 'date',
  value = '',
  onValueChange,
  min,
  max,
  name,
  ref,
  ...props
}: DateInputProps) {
  const withTime = type === 'datetime-local';
  const format = withTime ? formatDateTime : formatDate;
  const [previousValue, setPreviousValue] = React.useState(value);
  const [draft, setDraft] = React.useState(() => format(value));
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inputRef.current!);
  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(format(value));
  }
  const canonical = parseDisplayDate(draft, withTime);
  const outOfBounds = !!canonical && ((!!min && canonical < min) || (!!max && canonical > max));
  const invalid = !!draft && (canonical === undefined || outOfBounds);
  const placeholder = withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
  React.useEffect(() => {
    inputRef.current?.setCustomValidity(
      canonical === undefined
        ? placeholder
        : outOfBounds
          ? `${min ? format(min) : '…'} – ${max ? format(max) : '…'}`
          : ''
    );
  }, [canonical, outOfBounds, min, max, format, placeholder]);
  function update(text: string) {
    const next = parseDisplayDate(text, withTime);
    const outside = !!next && ((!!min && next < min) || (!!max && next > max));
    inputRef.current?.setCustomValidity(
      next === undefined
        ? placeholder
        : outside
          ? `${min ? format(min) : '…'} – ${max ? format(max) : '…'}`
          : ''
    );
    setDraft(text);
    setPreviousValue(next ?? '');
    onValueChange?.(next ?? '');
  }
  const selected = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className='relative block min-w-0'>
        {name && <input type='hidden' name={name} value={value} disabled={props.disabled} />}
        <Input
          {...props}
          ref={inputRef}
          type='text'
          value={draft}
          placeholder={props.placeholder || placeholder}
          aria-invalid={props['aria-invalid'] || invalid}
          className={`${props.className ?? ''} pr-10`}
          onChange={(event) => update(event.target.value)}
        />
        <PopoverTrigger asChild>
          <button
            type='button'
            disabled={props.disabled || props.readOnly}
            aria-label={props['aria-label'] || props.title || 'Choose date (dd/MM/yyyy)'}
            className='absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40'
          >
            <CalendarDays className='size-4' />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent align='start' className='w-auto p-0'>
        <Calendar
          autoFocus
          mode='single'
          selected={selected && !Number.isNaN(selected.getTime()) ? selected : undefined}
          disabled={(date) => {
            const iso = parseDisplayDate(formatDate(date))!;
            return (!!min && iso < min.slice(0, 10)) || (!!max && iso > max.slice(0, 10));
          }}
          onSelect={(date) => {
            if (!date) {
              update('');
              return;
            }
            const text = formatDate(date) + (withTime ? ` ${value.slice(11, 16) || '00:00'}` : '');
            update(text);
            if (!withTime) setOpen(false);
          }}
        />
        {withTime && (
          <div className='border-t p-3'>
            <Input
              type='time'
              aria-label='HH:mm'
              value={value.slice(11, 16) || '00:00'}
              disabled={!value}
              onChange={(event) => update(`${formatDate(value)} ${event.target.value}`)}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
