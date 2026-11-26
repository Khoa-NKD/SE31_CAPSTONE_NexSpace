import { HourlyDateTimePicker } from './hourly-date-time-picker';
import { useEffect, useId, useState } from 'react';
import { formatDate, parseDisplayDate } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePublicOperatingHoursQuery, useSearchCalendarQuery } from '../../api/queries';
import { localTimestamp } from '../../utils/operating-hours';
import { searchIntervalFits } from '../../utils/search-hourly-slots';
import type { WorkspaceOperatingHour } from '../../api/types';
export interface ScheduleSelection {
  date: string;
  day: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  priceType?: 'HOURLY' | 'DAILY';
  isoDate?: string;
  isoStartTime?: string;
  isoEndTime?: string;
}

export interface DateTimePickerModalProps {
  searchFilters?: Pick<
    import('../../api/types').SearchCalendarParams,
    'search' | 'city' | 'district' | 'category' | 'resourceCategories'
  >;
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function parseTimeToMinutes(value?: string): number {
  const match = value
    ?.split('T')
    .pop()
    ?.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return 0;
  let h = Number(match[1]);
  if (match[3]) h = (h % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(match[2]);
}

function initialDay(props: DateTimePickerModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return props.initialDate instanceof Date
    ? localTimestamp(props.initialDate).slice(0, 10)
    : parseDisplayDate(props.initialDate ?? '')?.slice(0, 10) ||
        props.initialDate?.slice(0, 10) ||
        localTimestamp(tomorrow).slice(0, 10);
}
function initialTime(value: string | undefined) {
  if (!value) return '09:00';
  const minutes = parseTimeToMinutes(value);
  return (
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  );
}
export function DateTimePickerModal(props: DateTimePickerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen,
    setOpen = props.onOpenChange ?? setInternalOpen;
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, [open]);
  const [startDay, setStartDay] = useState(() => initialDay(props));
  const [startTime, setStartTime] = useState(() => initialTime(props.initialStartTime));
  const [mode, setMode] = useState<'HOURLY' | 'DAILY'>('HOURLY');
  const [days, setDays] = useState(1);
  const [validating, setValidating] = useState(false),
    [notice, setNotice] = useState('');
  const dayId = useId(),
    timeId = useId(),
    countId = useId();
  const queried = usePublicOperatingHoursQuery(
    props.operatingHours?.length ? null : props.workspaceId
  );
  const hours = props.operatingHours?.length ? props.operatingHours : (queried.data ?? []);
  const start = startDay + 'T' + startTime + ':00';
  const dailyEnd = new Date(+new Date(start) + days * 86400000);
  const end = Number.isFinite(+dailyEnd) ? localTimestamp(dailyEnd) : '';
  const canRequest =
    open &&
    mode === 'DAILY' &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDay) &&
    !!end &&
    days >= 1 &&
    days <= 90;
  const dailyCalendar = useSearchCalendarQuery(
    {
      from: startDay,
      to: end.slice(0, 10),
      workspaceId: props.workspaceId,
      ...props.searchFilters
    },
    canRequest
  );
  const available =
    !!dailyCalendar.data &&
    !dailyCalendar.isError &&
    searchIntervalFits(dailyCalendar.data.intervals, start, end);
  const valid =
    canRequest &&
    available &&
    +new Date(start) >= Math.floor(+clock / 60000) * 60000 &&
    !validating;
  const reason =
    notice ||
    (dailyCalendar.isError
      ? 'Chưa tải được lịch. Vui lòng thử lại.'
      : dailyCalendar.isPending
        ? 'Đang tải khung giờ khả dụng…'
        : +new Date(start) < Math.floor(+clock / 60000) * 60000
          ? 'Chọn thời gian bắt đầu trong tương lai.'
          : !available
            ? 'Không có chỗ phục vụ liên tục toàn bộ khoảng ngày–giờ này. Vui lòng chọn lại.'
            : '');
  async function confirm() {
    if (!valid) return;
    setValidating(true);
    setNotice('');
    try {
      const fresh = await dailyCalendar.refetch();
      if (fresh.error || !fresh.data) {
        setNotice('Chưa kiểm tra được lịch mới nhất. Vui lòng thử lại.');
        return;
      }
      if (
        +new Date(start) < Math.floor(+new Date() / 60000) * 60000 ||
        !searchIntervalFits(fresh.data.intervals, start, end)
      ) {
        setClock(new Date());
        setNotice('Khung giờ vừa thay đổi hoặc đã kín chỗ. Vui lòng chọn lại.');
        return;
      }
      props.onConfirm?.({
        date: formatDate(new Date(start)),
        day: new Date(start).getDate(),
        startTime,
        endTime: end.slice(11, 16),
        durationHours: days * 24,
        isoDate: startDay,
        isoStartTime: start,
        isoEndTime: end,
        priceType: 'DAILY'
      });
      setOpen(false);
    } finally {
      setValidating(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.children && <DialogTrigger asChild>{props.children}</DialogTrigger>}
      <DialogContent
        className={
          mode === 'HOURLY'
            ? 'w-[95vw] max-w-[420px] max-h-[90dvh] overflow-y-auto gap-3 rounded-2xl p-4'
            : 'max-w-lg'
        }
      >
        <DialogTitle>Chọn thời gian đặt chỗ</DialogTitle>
        <DialogDescription>
          {props.workspaceName ? props.workspaceName + ' · ' : ''}Chỉ chọn khoảng có chỗ phục vụ
          liên tục trong toàn bộ thời gian.
        </DialogDescription>
        <div className='flex gap-2'>
          <Button
            variant={mode === 'HOURLY' ? 'default' : 'outline'}
            onClick={() => {
              setMode('HOURLY');
              setNotice('');
            }}
          >
            Theo giờ
          </Button>
          <Button
            variant={mode === 'DAILY' ? 'default' : 'outline'}
            onClick={() => {
              setMode('DAILY');
              setNotice('');
            }}
          >
            Theo ngày (24 giờ)
          </Button>
        </div>
        {mode === 'HOURLY' ? (
          open && (
            <HourlyDateTimePicker
              {...props}
              hours={hours}
              onConfirm={(schedule) => {
                props.onConfirm?.(schedule);
                setOpen(false);
              }}
            />
          )
        ) : (
          <>
            <div className='grid grid-cols-2 gap-3'>
              <label htmlFor={dayId} className='space-y-2 text-sm'>
                Ngày bắt đầu
                <Input
                  id={dayId}
                  type='date'
                  min={localTimestamp(clock).slice(0, 10)}
                  value={startDay}
                  onChange={(event) => {
                    setStartDay(event.target.value);
                    setNotice('');
                  }}
                />
              </label>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <label htmlFor={timeId}>Giờ bắt đầu</label>
                </div>
                <Input
                  id={timeId}
                  type='time'
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setNotice('');
                  }}
                />
              </div>
            </div>
            <label htmlFor={countId} className='space-y-2 text-sm'>
              Số ngày
              <Input
                id={countId}
                type='number'
                min={1}
                max={90}
                step={1}
                value={days}
                onChange={(event) => {
                  setDays(Math.max(1, Math.min(90, Math.trunc(Number(event.target.value) || 1))));
                  setNotice('');
                }}
              />
            </label>
            <p className='text-sm text-muted-foreground'>
              Kết thúc: {Number.isFinite(+dailyEnd) ? dailyEnd.toLocaleString('vi-VN') : '—'} ·{' '}
              {days * 24} giờ liên tục
            </p>
            {reason && (
              <p role='status' className='text-sm text-muted-foreground'>
                {reason}
              </p>
            )}
            {dailyCalendar.isError && (
              <Button variant='outline' onClick={() => void dailyCalendar.refetch()}>
                Thử lại
              </Button>
            )}
            <Button disabled={!valid} onClick={() => void confirm()}>
              {validating ? 'Đang kiểm tra…' : 'Áp dụng thời gian'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
