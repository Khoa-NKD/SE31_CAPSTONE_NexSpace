import { holidayBookingError } from '../../utils/workspace-holidays';
import { useState } from 'react';
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
import type { WorkspaceOperatingHour } from '../../api/types';
import { usePublicOperatingHoursQuery, usePublicWorkspaceDetailQuery } from '../../api/queries';
import { coversOperatingHours, localTimestamp } from '../../utils/operating-hours';
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
export function DateTimePickerModal(props: DateTimePickerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = props.onOpenChange ?? setInternalOpen;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const initial =
    props.initialDate instanceof Date
      ? localTimestamp(props.initialDate).slice(0, 10)
      : parseDisplayDate(props.initialDate ?? '')?.slice(0, 10) ||
        props.initialDate?.slice(0, 10) ||
        localTimestamp(tomorrow).slice(0, 10);
  const time = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    const m = parseTimeToMinutes(value);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const [startDay, setStartDay] = useState(initial);
  const [endDay, setEndDay] = useState(initial);
  const [startTime, setStartTime] = useState(time(props.initialStartTime, '09:00'));
  const [endTime, setEndTime] = useState(time(props.initialEndTime, '13:00'));
  const [mode, setMode] = useState<'HOURLY' | 'DAILY'>('HOURLY');
  const [days, setDays] = useState(1);
  const queried = usePublicOperatingHoursQuery(
    props.operatingHours?.length ? null : props.workspaceId
  );
  const hours = props.operatingHours?.length ? props.operatingHours : (queried.data ?? []);
  const start = startDay + 'T' + startTime + ':00';
  const dailyEnd = new Date(new Date(start).getTime() + days * 86400000);
  const end =
    mode === 'DAILY' && Number.isFinite(+dailyEnd)
      ? localTimestamp(dailyEnd)
      : endDay + 'T' + endTime + ':00';
  const holidayWorkspace = usePublicWorkspaceDetailQuery(
    props.workspaceId ? String(props.workspaceId) : null
  );
  const holidayError = holidayBookingError(holidayWorkspace.data, start, end);
  const duration = (+new Date(end) - +new Date(start)) / 3600000;
  const valid =
    !holidayError &&
    (!props.workspaceId || !!holidayWorkspace.data) &&
    duration >= 0.5 &&
    +new Date(start) > Date.now() &&
    ((!props.workspaceId && !props.operatingHours?.length) ||
      coversOperatingHours(hours, start, end));
  function confirm() {
    if (!valid) return;
    props.onConfirm?.({
      date: formatDate(new Date(start)),
      day: new Date(start).getDate(),
      startTime,
      endTime: end.slice(11, 16),
      durationHours: duration,
      isoDate: startDay,
      isoStartTime: start,
      isoEndTime: end,
      priceType: mode
    });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.children && <DialogTrigger asChild>{props.children}</DialogTrigger>}
      <DialogContent className='max-w-lg'>
        <DialogTitle>Chọn thời gian đặt chỗ</DialogTitle>
        <DialogDescription>
          {props.workspaceName ?? 'Không gian'} · Giờ hoạt động được kiểm tra cho toàn bộ khoảng
          đặt.
        </DialogDescription>
        <div className='flex gap-2'>
          <Button
            variant={mode === 'HOURLY' ? 'default' : 'outline'}
            onClick={() => setMode('HOURLY')}
          >
            Theo giờ
          </Button>
          <Button
            variant={mode === 'DAILY' ? 'default' : 'outline'}
            onClick={() => setMode('DAILY')}
          >
            Theo ngày (24 giờ)
          </Button>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <label className='space-y-2 text-sm'>
            Ngày bắt đầu
            <Input
              type='date'
              min={localTimestamp(new Date()).slice(0, 10)}
              value={startDay}
              onChange={(e) => setStartDay(e.target.value)}
            />
          </label>
          <label className='space-y-2 text-sm'>
            Giờ bắt đầu
            <Input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>
        {mode === 'DAILY' ? (
          <label className='space-y-2 text-sm'>
            Số ngày
            <Input
              type='number'
              min={1}
              max={90}
              step={1}
              value={days}
              onChange={(e) =>
                setDays(Math.max(1, Math.min(90, Math.trunc(Number(e.target.value) || 1))))
              }
            />
          </label>
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            <label className='space-y-2 text-sm'>
              Ngày kết thúc
              <Input
                type='date'
                min={startDay}
                value={endDay}
                onChange={(e) => setEndDay(e.target.value)}
              />
            </label>
            <label className='space-y-2 text-sm'>
              Giờ kết thúc
              <Input type='time' value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
        )}
        {mode === 'DAILY' && (
          <p className='text-sm text-muted-foreground'>
            Kết thúc: {Number.isFinite(+dailyEnd) ? dailyEnd.toLocaleString('vi-VN') : '—'} ·{' '}
            {days * 24} giờ liên tục
          </p>
        )}
        {!valid && (
          <p role='status' className='text-sm text-muted-foreground'>
            {holidayError
              ? holidayError
              : props.workspaceId && queried.isPending && !props.operatingHours?.length
                ? 'Đang tải giờ hoạt động…'
                : queried.isError
                  ? 'Không tải được giờ hoạt động. Vui lòng thử lại.'
                  : 'Chọn khoảng trong tương lai, tối thiểu 30 phút và nằm trọn trong giờ mở cửa.'}
          </p>
        )}
        <Button disabled={!valid} onClick={confirm}>
          Áp dụng thời gian
        </Button>
      </DialogContent>
    </Dialog>
  );
}
