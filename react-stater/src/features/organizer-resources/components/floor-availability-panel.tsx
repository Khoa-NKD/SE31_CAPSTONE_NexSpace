import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  floorAvailabilityOptions,
  type FloorLayout,
  type AvailabilityState
} from '../api/resources';
import { availabilityInterval, availabilityColors, availabilityLabel } from '../utils/availability';
import { FloorLayoutPreview } from './floor-layout-preview';

const localInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export function useFloorAvailability(
  actorId: number,
  workspaceId: number,
  floorId: number,
  enabled: boolean
) {
  const [initial] = useState(() => {
    const from = new Date();
    from.setSeconds(0, 0);
    return { from: localInput(from), to: localInput(new Date(from.getTime() + 3600000)) };
  });
  const [from, setFrom] = useState(initial.from),
    [to, setTo] = useState(initial.to);
  const [range, setRange] = useState(() => availabilityInterval(initial.from, initial.to)!);
  const query = useQuery({
    ...floorAvailabilityOptions(actorId, workspaceId, floorId, range.from, range.to),
    enabled: enabled && actorId > 0 && floorId > 0
  });
  const states: Record<number, AvailabilityState> = Object.fromEntries(
    (query.data?.resources ?? []).map((item) => [item.id, item.state])
  );
  const valid = availabilityInterval(from, to);
  const apply = () => {
    if (!valid) return;
    if (valid.from === range.from && valid.to === range.to) void query.refetch();
    else setRange(valid);
  };
  return { from, to, setFrom, setTo, query, states, valid, apply };
}
type Calendar = ReturnType<typeof useFloorAvailability>;
type Focus = { key: string | null; sequence: number };
export function FloorAvailabilityPanel({
  layout,
  calendar,
  focus,
  onFocus
}: {
  layout: FloorLayout;
  calendar: Calendar;
  focus: Focus;
  onFocus: (key: string | null) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  if (calendar.query.isError)
    return (
      <div role='alert' className='m-auto space-y-3 p-6 text-center'>
        <p className='text-xs text-destructive'>{calendar.query.error.message}</p>
        <Button variant='outline' size='sm' onClick={() => void calendar.query.refetch()}>
          {c('Retry', 'Thử lại')}
        </Button>
      </div>
    );
  if (calendar.query.isPending)
    return (
      <div role='status' className='m-auto flex items-center gap-2 text-sm text-muted-foreground'>
        <LoaderCircle className='size-4 animate-spin' />
        {c('Reading calendar…', 'Đang đọc lịch…')}
      </div>
    );
  return (
    <FloorLayoutPreview
      presentation='workspace'
      layout={layout}
      width={layout.width ?? 1200}
      height={layout.height ?? 800}
      availability={calendar.states}
      focus={focus}
      onFocus={onFocus}
    />
  );
}
export function FloorAvailabilityInspector({
  calendar,
  layout,
  focus,
  workspaceStatus
}: {
  calendar: Calendar;
  layout: FloorLayout;
  focus: Focus;
  workspaceStatus: string;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const c = (en: string, local: string) => (vi ? local : en);
  const resource = layout.resources.find((item) => `resource:${item.id}` === focus.key);
  const object = layout.decorations?.find((item) => `decoration:${item.id}` === focus.key);
  const state = resource && calendar.states[resource.id];
  return (
    <div className='space-y-4'>
      <div className='rounded-xl border border-border bg-muted/20 p-3'>
        <p className='text-xs font-semibold'>
          {resource?.name ?? object?.label ?? c('Select a seat or room', 'Chọn ghế hoặc phòng')}
        </p>
        {resource && <p className='mt-1 text-[11px] text-muted-foreground'>{resource.code}</p>}
        {state ? (
          <p
            className='mt-3 rounded-lg border px-2.5 py-2 text-xs font-semibold'
            style={{ color: availabilityColors[state], borderColor: availabilityColors[state] }}
          >
            {availabilityLabel(state, vi)}
          </p>
        ) : (
          <p className='mt-2 text-[11px] text-muted-foreground'>
            {object
              ? c('Furniture has no booking status.', 'Đồ bố trí không có trạng thái đặt chỗ.')
              : c(
                  'Click the map or the resource list.',
                  'Bấm trên sơ đồ hoặc chọn ở danh sách bên trái.'
                )}
          </p>
        )}
        {state === 'DISABLED' && (
          <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>
            {workspaceStatus !== 'ACTIVE'
              ? c(
                  'The workspace is not active, so this place is not open for booking.',
                  'Workspace chưa hoạt động nên chỗ này chưa mở nhận đặt.'
                )
              : c(
                  'This place is not enabled or its floor/type is not ready for booking.',
                  'Chỗ chưa bật nhận đặt hoặc tầng/loại chỗ chưa đủ điều kiện.'
                )}
          </p>
        )}
      </div>
      <div className='space-y-3 border-t border-border pt-4'>
        <h3 className='text-xs font-semibold'>{c('Time interval', 'Khoảng thời gian')}</h3>
        {(
          [
            ['from', c('From', 'Từ')],
            ['to', c('To', 'Đến')]
          ] as const
        ).map(([key, label]) => (
          <label key={key} className='block space-y-1.5 text-[11px] text-muted-foreground'>
            {label}
            <Input
              type='datetime-local'
              className='h-9 min-w-0 text-xs'
              value={calendar[key]}
              onChange={(event) =>
                key === 'from'
                  ? calendar.setFrom(event.target.value)
                  : calendar.setTo(event.target.value)
              }
            />
          </label>
        ))}
        <p className='text-[10px] text-muted-foreground'>
          {c('Times use your device timezone.', 'Giờ theo múi giờ trên thiết bị của bạn.')}
        </p>
        <Button
          className='w-full'
          size='sm'
          disabled={!calendar.valid || calendar.query.isFetching}
          onClick={calendar.apply}
        >
          {calendar.query.isFetching ? (
            <LoaderCircle className='size-4 animate-spin' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          {c('View / refresh', 'Xem / làm mới')}
        </Button>
        {!calendar.valid && (
          <p role='alert' className='text-xs text-destructive'>
            {c('End must follow start.', 'Giờ kết thúc phải sau giờ bắt đầu.')}
          </p>
        )}
      </div>
      <div className='space-y-2 border-t border-border pt-4'>
        <h3 className='text-xs font-semibold'>{c('Statuses', 'Trạng thái')}</h3>
        {(Object.keys(availabilityColors) as AvailabilityState[]).map((status) => (
          <div key={status} className='flex items-center justify-between gap-2 text-[11px]'>
            <span className='flex items-center gap-2'>
              <span
                className='size-2 rounded-full'
                style={{ backgroundColor: availabilityColors[status] }}
              />
              {availabilityLabel(status, vi)}
            </span>
            <span className='tabular-nums text-muted-foreground'>
              {calendar.query.data
                ? Object.values(calendar.states).filter((value) => value === status).length
                : '—'}
            </span>
          </div>
        ))}
      </div>
      {calendar.query.data && (
        <div className='space-y-1 border-t border-border pt-3 text-[10px] text-muted-foreground'>
          <p>{c('Applied interval', 'Khoảng giờ đang xem')}:</p>
          <p>{new Date(calendar.query.data.from).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</p>
          <p>→ {new Date(calendar.query.data.to).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</p>
          <p className='pt-1'>
            {c('Updated', 'Cập nhật')}:{' '}
            {new Date(calendar.query.data.asOf).toLocaleTimeString(vi ? 'vi-VN' : 'en-GB')}
          </p>
        </div>
      )}
      <p className='text-[10px] leading-relaxed text-muted-foreground'>
        {c(
          'Viewing only; this does not hold or modify bookings.',
          'Chỉ xem trạng thái; không giữ chỗ hay thay đổi booking.'
        )}
      </p>
    </div>
  );
}
