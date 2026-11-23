import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ChartNoAxesGantt,
  Layers,
  CalendarDays,
  Clock3,
  CalendarOff,
  DoorOpen,
  Armchair
} from '@/components/ui/hugeicons';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  useOperationsWorkspace,
  OperationsHeader,
  OperationsState,
  OperationMetrics,
  panelClass,
  selectClass
} from '@/features/organizer-operations/components/operations-shared';
import { operationsApi, type OperationResource } from '@/features/organizer-operations/api';
import { workspaceService } from '@/features/workspaces/api/service';
import { localDate } from '@/features/organizer-analytics/format';
import { exportRows, operationMoney, floorNumbers } from '@/features/organizer-operations/format';
import { formatDateLabel, formatDateTime } from '@/lib/format';
import { timelineEvents, eventsForResource, positionEvents, type TimelineEvent } from '../timeline';

import { scheduleTone, scheduleStatus } from '../status';
const emptyResources: OperationResource[] = [];
function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function ScheduleLiveView() {
  const c = useOrganizerCopy();
  const state = useOperationsWorkspace();
  const [date, setDate] = useState(() => localDate(new Date()));
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('day');
  const [floor, setFloor] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const range = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    if (mode === 'week') {
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const from = localDate(d);
      return { from, to: shift(from, 7), days: 7 };
    }
    if (mode === 'month') {
      d.setDate(1);
      const from = localDate(d);
      d.setMonth(d.getMonth() + 1);
      return { from, to: localDate(d), days: new Date(d.getFullYear(), d.getMonth(), 0).getDate() };
    }
    return { from: date, to: shift(date, 1), days: 1 };
  }, [date, mode]);
  const query = useQuery({
    queryKey: ['organizer-operations', state.actor, state.workspaceId, 'schedule', range],
    queryFn: async ({ signal }) => {
      const [bookings, blocks] = await Promise.all([
        workspaceService.getOrganizerCalendarEvents({
          workspaceId: state.workspaceId,
          startDate: range.from,
          endDate: shift(range.to, -1)
        }),
        operationsApi.blocks(
          state.workspaceId!,
          `${range.from}T00:00:00`,
          `${range.to}T00:00:00`,
          signal
        )
      ]);
      return { bookings, blocks };
    },
    enabled: !!state.workspaceId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });
  const resources = state.pricing.data?.resources ?? emptyResources;
  const [now] = useState(() => new Date());
  const events = useMemo(
    () => timelineEvents(query.data?.bookings ?? [], query.data?.blocks ?? [], resources, now),
    [query.data, resources, now]
  );
  const filtered = resources.filter(
    (r) =>
      (floor === 'all' || r.floorNumber === Number(floor)) &&
      (category === 'all' || r.category === category) &&
      (`${r.name} ${r.code} ${r.typeName}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) ||
        eventsForResource(events, r).some((e) =>
          `${e.title} ${e.booking?.customerName ?? ''}`
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase())
        ))
  );
  const visibleKeys = new Set(
    filtered.flatMap((r) => eventsForResource(events, r).map((e) => e.key))
  );
  const shownEvents = events.filter((e) => visibleKeys.has(e.key));
  const columns = mode === 'day' ? 24 : range.days;
  function move(direction: number) {
    if (mode === 'month') {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(1);
      d.setMonth(d.getMonth() + direction);
      setDate(localDate(d));
    } else setDate(shift(date, direction * (mode === 'week' ? 7 : 1)));
  }
  return (
    <div className='mx-auto w-full max-w-[1800px] space-y-5 pb-10'>
      <OperationsHeader
        icon={<ChartNoAxesGantt />}
        title={c('Resource timeline', 'Lịch biểu (Gantt)')}
        description={c(
          'Bookings, active holds and blockouts on the same timeline.',
          'Booking, giữ chỗ và lịch khóa trên cùng một trục thời gian.'
        )}
        state={{
          ...state,
          setWorkspaceId: (id) => {
            setFloor('all');
            setSelected(null);
            state.setWorkspaceId(id);
          }
        }}
      />
      <OperationsState state={state} />
      {state.pricing.data && (
        <>
          <OperationMetrics
            items={[
              {
                label: c('Visible resources', 'Ghế / phòng đang xem'),
                value: filtered.length,
                icon: Layers,
                unit: c('resources', 'chỗ')
              },
              {
                label: c('Bookings in range', 'Booking trong khoảng đang xem'),
                value: shownEvents.filter((e) => e.booking).length,
                icon: CalendarDays,
                unit: c('bookings', 'đơn')
              },
              {
                label: c('Awaiting action', 'Đang chờ duyệt / thanh toán'),
                value: shownEvents.filter(
                  (e) => e.status === 'PENDING_APPROVAL' || e.status === 'PENDING_PAYMENT'
                ).length,
                icon: Clock3,
                unit: c('bookings', 'đơn')
              },
              {
                label: c('Blockout entries', 'Khung giờ ngừng nhận đặt'),
                value: shownEvents.filter((e) => e.block).length,
                icon: CalendarOff,
                unit: c('entries', 'lịch')
              }
            ]}
          />
          <section className={`${panelClass} space-y-4`}>
            <div className='organizer-toolbar justify-between'>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  variant='outline'
                  size='icon'
                  aria-label={c('Previous period', 'Khoảng trước')}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft className='size-4' />
                </Button>
                <DateInput
                  value={date}
                  onValueChange={(value) => {
                    if (value) setDate(value);
                  }}
                />
                <Button
                  variant='outline'
                  size='icon'
                  aria-label={c('Next period', 'Khoảng tiếp')}
                  onClick={() => move(1)}
                >
                  <ChevronRight className='size-4' />
                </Button>
                <Button variant='outline' onClick={() => setDate(localDate(new Date()))}>
                  {c('Today', 'Hôm nay')}
                </Button>
                <div
                  role='group'
                  aria-label={c('Timeline scale', 'Chế độ lịch')}
                  className='flex items-center gap-1 rounded-xl border bg-background p-1'
                >
                  {(
                    [
                      { value: 'day', label: c('Day', 'Ngày') },
                      { value: 'week', label: c('Week', 'Tuần') },
                      { value: 'month', label: c('Month', 'Tháng') }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      type='button'
                      aria-pressed={mode === item.value}
                      onClick={() => setMode(item.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${mode === item.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant='outline'
                disabled={!query.data}
                onClick={() =>
                  exportRows('lich-bieu.csv', [
                    ['Code', 'Resource', 'Start', 'End', 'Status'],
                    ...shownEvents.map((e) => [
                      e.title,
                      resources.find((r) => r.id === e.resourceId)?.name,
                      formatDateTime(e.startTime),
                      formatDateTime(e.endTime),
                      scheduleStatus(e.status, c)
                    ])
                  ])
                }
              >
                <Download className='size-4' />
                {c('Export CSV', 'Xuất CSV')}
              </Button>
            </div>
            <div className='flex flex-wrap gap-2'>
              <select
                className={selectClass}
                aria-label={c('Floor', 'Tầng')}
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              >
                <option value='all'>{c('All floors', 'Tất cả tầng')}</option>
                {floorNumbers(resources).map((n) => (
                  <option key={n} value={n}>
                    {c('Floor', 'Tầng')} {n}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label={c('Resource category', 'Loại tài nguyên')}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value='all'>{c('Seats and rooms', 'Ghế và phòng')}</option>
                <option value='DESK'>{c('Seats', 'Ghế')}</option>
                <option value='ROOM'>{c('Rooms', 'Phòng')}</option>
              </select>
              <Input
                className='max-w-sm'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={c(
                  'Search resource, guest or booking…',
                  'Tìm ghế/phòng, khách hoặc mã đặt…'
                )}
              />
            </div>
            <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs'>
              {[
                'CONFIRMED',
                'CHECKED_IN',
                'PENDING_PAYMENT',
                'PENDING_APPROVAL',
                'COMPLETED',
                'BLOCKED',
                'MAINTENANCE'
              ].map((s) => (
                <span
                  key={s}
                  className='flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/20 px-2.5 py-1'
                >
                  <span className={`size-2.5 rounded border ${scheduleTone[s]}`} />
                  {scheduleStatus(s, c)}
                </span>
              ))}
            </div>
            <p className='text-xs text-muted-foreground'>
              {c(
                'Times use your device timezone. Seats inside a room inherit that room’s booking/blockout. Click an event for details.',
                'Giờ theo múi giờ thiết bị. Ghế trong phòng hiển thị booking/lịch khóa kế thừa từ phòng. Bấm khung lịch để xem chi tiết.'
              )}
            </p>
            {query.isPending && <p role='status'>{c('Loading schedule…', 'Đang tải lịch…')}</p>}
            {query.error && (
              <p role='alert' className='text-sm text-destructive'>
                {query.error.message}{' '}
                <Button variant='outline' onClick={() => void query.refetch()}>
                  {c('Retry', 'Thử lại')}
                </Button>
              </p>
            )}
            {query.data && (
              <div className='max-h-[680px] overflow-auto rounded-xl border'>
                <div
                  style={{
                    minWidth:
                      mode === 'day'
                        ? 1500
                        : mode === 'month'
                          ? Math.max(1500, columns * 90 + 220)
                          : 1300
                  }}
                >
                  <div className='sticky top-0 z-30 flex border-b bg-muted text-[10px] font-medium text-muted-foreground'>
                    <div className='sticky left-0 z-40 w-[220px] shrink-0 border-r bg-card p-3 font-medium'>
                      {c('Resource / floor', 'Ghế, phòng / tầng')}
                    </div>
                    <div
                      className='grid flex-1'
                      style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }}
                    >
                      {Array.from({ length: columns }, (_, i) => (
                        <div key={i} className='border-r p-2 text-center'>
                          {mode === 'day'
                            ? `${String(i).padStart(2, '0')}:00`
                            : formatDateLabel(shift(range.from, i))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {filtered.map((r) => {
                    const positioned = positionEvents(
                      eventsForResource(events, r),
                      `${range.from}T00:00:00`,
                      `${range.to}T00:00:00`
                    );
                    const height = Math.max(
                      56,
                      (Math.max(0, ...positioned.map((p) => p.lane)) + 1) * 34 + 14
                    );
                    return (
                      <div
                        key={r.id}
                        className='group flex border-b transition-colors last:border-0 hover:bg-primary/[0.025]'
                        style={{ minHeight: height }}
                      >
                        <div className='sticky left-0 z-20 w-[220px] shrink-0 border-r bg-card p-3'>
                          <p className='flex items-center gap-2 text-xs font-semibold'>
                            {r.category === 'ROOM' ? (
                              <DoorOpen className='size-3.5 shrink-0 text-primary' />
                            ) : (
                              <Armchair className='size-3.5 shrink-0 text-muted-foreground' />
                            )}
                            <span className='truncate'>{r.name || r.code}</span>
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {c('Floor', 'Tầng')} {r.floorNumber} · {r.code}
                            {r.parentRoomId && ` · ${c('In room', 'Trong phòng')}`}
                          </p>
                        </div>
                        <div
                          className='relative flex-1'
                          style={{
                            backgroundImage: `linear-gradient(to right,var(--border) 1px,transparent 1px)`,
                            backgroundSize: `${100 / columns}% 100%`
                          }}
                        >
                          {positioned.map((p) => (
                            <button
                              key={p.event.key}
                              className={`absolute truncate rounded-lg border px-2 text-left text-[11px] font-medium shadow-xs transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring ${scheduleTone[p.event.status] ?? 'border-slate-400 bg-muted'} ${p.event.resourceId !== r.id ? 'border-dashed opacity-75' : ''}`}
                              style={{
                                left: `${p.left}%`,
                                width: `${p.width}%`,
                                top: 7 + p.lane * 34,
                                height: 28
                              }}
                              title={`${p.event.title} · ${scheduleStatus(p.event.status, c)} · ${formatDateTime(p.event.startTime)} → ${formatDateTime(p.event.endTime)}${p.event.resourceId !== r.id ? ` · ${c('Inherited', 'Kế thừa')}` : ''}`}
                              onClick={() => setSelected(p.event)}
                            >
                              {p.event.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!filtered.length && (
                    <p className='p-10 text-sm text-muted-foreground'>
                      {c('No matching resources.', 'Chưa có ghế/phòng phù hợp.')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected && scheduleStatus(selected.status, c)} ·{' '}
              {resources.find((r) => r.id === selected?.resourceId)?.name}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className='space-y-3 text-sm'>
              <p>
                {formatDateTime(selected.startTime)} → {formatDateTime(selected.endTime)}
              </p>
              {selected.booking && (
                <>
                  <p>
                    {c('Customer', 'Khách')}: {selected.booking.customerName || '—'}
                  </p>
                  <p>
                    {c('Booking total', 'Tổng tiền booking')}:{' '}
                    {operationMoney(
                      String(selected.booking.finalPrice),
                      resources.find((r) => r.id === selected.resourceId)?.currency
                    )}
                  </p>
                  <Link
                    to='/dashboard/organizer/bookings'
                    search={{ workspaceId: state.workspaceId }}
                    className='inline-block text-primary hover:underline'
                  >
                    {c('Open booking management →', 'Mở quản lý đặt chỗ →')}
                  </Link>
                </>
              )}
              {selected.block && (
                <>
                  <p className='whitespace-pre-wrap'>{selected.block.reason}</p>
                  <Link
                    to='/dashboard/organizer/blockout'
                    className='inline-block text-primary hover:underline'
                  >
                    {c('Manage blockouts →', 'Quản lý lịch ngừng nhận đặt →')}
                  </Link>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
