import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Wrench, Trash2, RefreshCw } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  useOperationsWorkspace,
  OperationsState,
  panelClass
} from '@/features/organizer-operations/components/operations-shared';
import { maintenanceApi, type MaintenanceSchedule, type MaintenanceTarget } from '../api';
import { MaintenanceTargetPicker } from './maintenance-target-picker';
import { localDate } from '@/features/organizer-analytics/format';
import { formatDate } from '@/lib/format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { workspaceService } from '@/features/workspaces/api/service';
import { operationsApi } from '@/features/organizer-operations/api';
import { maintenanceConflicts, maintenanceTimeConflict } from '../utils/maintenance-time';

function nextDay(value: string) {
  const d = new Date(value + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return localDate(d);
}

export function BlockoutLiveView({ initialWorkspaceId }: { initialWorkspaceId?: number }) {
  const state = useOperationsWorkspace(initialWorkspaceId);
  const c = useOrganizerCopy();
  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 pb-10'>
      <header className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/50 px-4 py-3'>
        <h1 className='flex items-center gap-2.5 text-lg font-semibold'>
          <Wrench className='size-5 text-primary' />
          {c('Maintenance schedule', 'Lịch bảo trì')}
        </h1>
        <div className='flex items-center gap-2'>
          <label className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='hidden sm:inline'>{c('Workspace', 'Không gian')}</span>
            <select
              aria-label={c('Workspace', 'Không gian')}
              className='organizer-control max-w-60'
              value={state.workspaceId ?? ''}
              onChange={(e) => state.setWorkspaceId(Number(e.target.value))}
              disabled={!state.workspaces.data?.length}
            >
              {!state.workspaces.data?.length && (
                <option value=''>{c('No workspaces', 'Chưa có không gian')}</option>
              )}
              {state.workspaces.data?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={c('Refresh', 'Làm mới')}
            onClick={() => void state.invalidate()}
          >
            <RefreshCw className='size-4' />
          </Button>
        </div>
      </header>
      <OperationsState state={state} />
      {state.workspaceId && (
        <MaintenanceWorkspace
          key={state.workspaceId}
          workspaceId={state.workspaceId}
          actor={state.actor}
          invalidate={state.invalidate}
        />
      )}
    </div>
  );
}

function MaintenanceWorkspace({
  workspaceId,
  actor,
  invalidate
}: {
  workspaceId: number;
  actor: number;
  invalidate: () => Promise<void>;
}) {
  const c = useOrganizerCopy();
  const client = useQueryClient();
  const [from, setFrom] = useState(() => localDate(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return localDate(d);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [startDay, setStartDay] = useState(() => localDate(new Date()));
  const [endDay, setEndDay] = useState(() => localDate(new Date()));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remove, setRemove] = useState<MaintenanceSchedule | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const today = localDate(new Date(clock));
  const localNow = new Date(clock - new Date(clock).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
  const start = startDay ? (startDay === today ? localNow : startDay + 'T00:00:00') : '';
  const end = endDay ? nextDay(endDay) + 'T00:00:00' : '';
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 3000);
    return () => window.clearInterval(timer);
  }, []);
  const validRange = Boolean(
    from && to && from <= to && (Date.parse(to) - Date.parse(from)) / 86400000 < 366
  );
  const targets = useQuery({
    queryKey: ['organizer-operations', actor, workspaceId, 'maintenance-targets'],
    queryFn: ({ signal }) => maintenanceApi.targets(workspaceId, signal),
    refetchInterval: 3000
  });
  const schedules = useQuery({
    queryKey: ['organizer-operations', actor, workspaceId, 'maintenance', from, to],
    queryFn: ({ signal }) =>
      maintenanceApi.list(workspaceId, from + 'T00:00:00', nextDay(to) + 'T00:00:00', signal),
    enabled: validRange,
    refetchInterval: 3000
  });
  const all = targets.data ?? [];
  const periodFrom = startDay < endDay ? startDay : endDay;
  const periodTo = startDay > endDay ? startDay : endDay;
  const periodValid =
    !!periodFrom && !!periodTo && (Date.parse(periodTo) - Date.parse(periodFrom)) / 86400000 < 366;
  const reservations = useQuery({
    queryKey: [
      'organizer-operations',
      actor,
      workspaceId,
      'maintenance-availability',
      periodFrom,
      periodTo
    ],
    enabled: periodValid && selected.length > 0,
    refetchInterval: 3000,
    queryFn: async ({ signal }) => {
      const [bookings, maintenance, blocks, pendingHolds, awaitingApproval] = await Promise.all([
        workspaceService.getOrganizerCalendarEvents({
          workspaceId,
          startDate: periodFrom,
          endDate: periodTo
        }),
        maintenanceApi.list(
          workspaceId,
          periodFrom + 'T00:00:00',
          nextDay(periodTo) + 'T00:00:00',
          signal
        ),
        operationsApi.blocks(
          workspaceId,
          periodFrom + 'T00:00:00',
          nextDay(periodTo) + 'T00:00:00',
          signal
        ),
        // A checkout countdown may be active today for usage on a later day.
        workspaceService.getOrganizerCalendarEvents({ workspaceId, status: 'PENDING_PAYMENT' }),
        workspaceService.getOrganizerCalendarEvents({ workspaceId, status: 'PENDING_APPROVAL' })
      ]);
      const combined = new Map(
        [...bookings, ...pendingHolds, ...awaitingApproval].map((booking) => [booking.id, booking])
      );
      return { bookings: [...combined.values()], maintenance, blocks };
    }
  });
  const conflicts = maintenanceConflicts(
    all,
    selected,
    reservations.data?.bookings ?? [],
    reservations.data?.maintenance ?? [],
    reservations.data?.blocks ?? [],
    clock
  );
  let periodError = '';
  if (!periodValid)
    periodError = c(
      'Choose a valid date range within 366 days.',
      'Chọn khoảng ngày hợp lệ, tối đa 366 ngày.'
    );
  else if (startDay < today)
    periodError = c('Start date cannot be in the past.', 'Ngày bắt đầu không được ở quá khứ.');
  else if (endDay < startDay)
    periodError = c(
      'End date must be on or after start date.',
      'Ngày kết thúc phải từ ngày bắt đầu trở đi.'
    );
  else if (selected.length && !reservations.isPending && !reservations.isError) {
    const conflict = maintenanceTimeConflict(start, end, conflicts);
    if (conflict)
      periodError =
        c(
          'These dates overlap a booking, active hold or existing maintenance.',
          'Khoảng ngày này trùng booking, giữ chỗ đang hiệu lực hoặc lịch bảo trì đã có.'
        ) +
        ' · ' +
        conflict.name;
  }
  const labels = {
    ROOM: c('Room', 'Phòng'),
    DESK: c('Seat', 'Ghế'),
    ASSET: c('Equipment', 'Thiết bị'),
    DECORATION: c('Furniture', 'Đồ bố trí')
  };
  function inherited(t: MaintenanceTarget | undefined) {
    return (
      t != null &&
      t.kind !== 'ROOM' &&
      t.parentRoomId != null &&
      selected.includes('RESOURCE:' + t.parentRoomId)
    );
  }
  async function refresh() {
    await Promise.all([
      invalidate(),
      client.invalidateQueries({ queryKey: ['workspace-assets'] }),
      targets.refetch(),
      schedules.refetch()
    ]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (periodError || !reservations.data || reservations.isError) {
      setError(
        periodError || c('Wait for availability to load.', 'Chờ kiểm tra khung giờ trước khi lưu.')
      );
      return;
    }
    const direct = selected.filter((key) => !inherited(all.find((t) => t.key === key)!));
    if (!direct.length || direct.length > 200) {
      setError(c('Select 1–200 targets.', 'Chọn từ 1 đến 200 đối tượng.'));
      return;
    }
    if (!start || !end || start >= end || new Date(start).getTime() < Date.now() - 120000) {
      setError(
        c('Choose a valid future period.', 'Chọn giờ bắt đầu từ hiện tại và kết thúc sau bắt đầu.')
      );
      return;
    }
    setBusy(true);
    try {
      await maintenanceApi.create(workspaceId, {
        targetKeys: direct,
        startTime: start,
        endTime: end,
        reason: reason.trim()
      });
      setSelected([]);
      setReason('');
      await refresh();
      toast.success(c('Maintenance saved', 'Đã tạo lịch bảo trì'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const now = new Date();
  return (
    <>
      <div className='grid gap-5'>
        <section id='maintenance-form' className={panelClass}>
          <h2 className='flex items-center gap-2 text-base font-semibold'>
            <Wrench className='size-5 text-primary' />
            {c('Schedule maintenance', 'Tạo lịch bảo trì')}
          </h2>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            {c(
              'Select items on the left, then set the maintenance period.',
              'Chọn phòng, ghế hoặc đồ bố trí bên trái, rồi đặt thời gian bảo trì bên phải.'
            )}
          </p>
          <form
            className='mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]'
            onSubmit={save}
          >
            <MaintenanceTargetPicker
              targets={all}
              selected={selected}
              onChange={setSelected}
              busy={busy}
              loading={targets.isPending}
              error={targets.error?.message}
            />
            <div className='space-y-4 rounded-xl border bg-muted/15 p-4 lg:sticky lg:top-24'>
              <p className='text-sm font-semibold'>
                {c('Maintenance period', 'Thời gian bảo trì')}
              </p>
              <div className='grid grid-cols-2 gap-3'>
                <label className='block min-w-0 space-y-1.5 text-sm'>
                  <span>{c('From date', 'Từ ngày')} *</span>
                  <DateInput
                    required
                    value={startDay}
                    min={today}
                    onValueChange={(day) => {
                      setStartDay(day);
                      if (day > endDay) setEndDay(day);
                    }}
                  />
                </label>
                <label className='block min-w-0 space-y-1.5 text-sm'>
                  <span>{c('Through date', 'Đến ngày')} *</span>
                  <DateInput
                    required
                    value={endDay}
                    min={startDay || today}
                    onValueChange={setEndDay}
                  />
                </label>
              </div>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                {c(
                  'Through the end of the selected date. Starting today takes effect immediately.',
                  'Bảo trì đến hết ngày kết thúc. Chọn hôm nay sẽ áp dụng từ lúc tạo lịch.'
                )}
              </p>
              {periodError && (
                <p role='alert' className='text-xs leading-relaxed text-destructive'>
                  {periodError}
                </p>
              )}
              {reservations.isPending && selected.length > 0 && (
                <p role='status' className='text-xs text-muted-foreground'>
                  {c('Checking dates…', 'Đang kiểm tra lịch…')}
                </p>
              )}
              {reservations.isError && (
                <button
                  type='button'
                  className='text-xs text-destructive underline'
                  onClick={() => void reservations.refetch()}
                >
                  {c('Retry availability', 'Thử kiểm tra lại lịch')}
                </button>
              )}
              <label className='block space-y-1 text-sm'>
                {c('Reason', 'Lý do')} *
                <Input
                  required
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {error && !remove && (
                <p role='alert' className='text-sm text-destructive'>
                  {error}
                </p>
              )}
              <Button
                type='submit'
                className='w-full'
                disabled={
                  busy ||
                  !selected.length ||
                  targets.isPending ||
                  !!targets.error ||
                  !start ||
                  !end ||
                  !!periodError ||
                  reservations.isPending ||
                  reservations.isError
                }
              >
                {busy ? c('Saving…', 'Đang lưu…') : c('Save maintenance', 'Tạo lịch bảo trì')}
              </Button>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                {c(
                  'Existing bookings and active holds cannot be overwritten.',
                  'Không tạo bảo trì trùng với booking hoặc giữ chỗ đang có hiệu lực.'
                )}
              </p>
            </div>
          </form>
        </section>
        <section className={panelClass}>
          <h2 className='flex items-center gap-2 font-semibold'>
            <CalendarRange className='size-4 text-primary' />
            {c('Maintenance periods', 'Các lịch bảo trì')}
          </h2>
          <div className='mt-4 flex flex-wrap gap-3'>
            <label className='space-y-1 text-xs'>
              {c('From date', 'Từ ngày')}
              <DateInput value={from} onValueChange={setFrom} />
            </label>
            <label className='space-y-1 text-xs'>
              {c('To date', 'Đến ngày')}
              <DateInput value={to} onValueChange={setTo} />
            </label>
          </div>
          {!validRange && (
            <p role='alert' className='mt-3 text-sm text-destructive'>
              {c('Choose a range within 366 days.', 'Chọn khoảng ngày hợp lệ, tối đa 366 ngày.')}
            </p>
          )}
          {schedules.isPending && validRange && (
            <p role='status' className='py-6 text-sm'>
              {c('Loading maintenance…', 'Đang tải lịch bảo trì…')}
            </p>
          )}
          {schedules.error && (
            <p role='alert' className='mt-4 text-sm text-destructive'>
              {schedules.error.message}
              <Button variant='outline' onClick={() => void schedules.refetch()}>
                {c('Retry', 'Thử lại')}
              </Button>
            </p>
          )}
          {!schedules.isPending && !schedules.error && validRange && !schedules.data?.length && (
            <div className='mt-4 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground'>
              <Wrench className='mx-auto mb-3 size-7' />
              {c('No maintenance in these dates.', 'Chưa có lịch bảo trì trong khoảng ngày này.')}
            </div>
          )}
          <div className='mt-4 max-h-[640px] space-y-3 overflow-auto'>
            {schedules.data?.map((s) => {
              const ended = s.endTime != null && new Date(s.endTime) <= now;
              const ongoing = !ended && new Date(s.startTime) <= now;
              return (
                <article key={s.key} className='rounded-xl border bg-muted/10 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-sm font-semibold'>{s.name}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {labels[s.kind]}
                        {s.floorNumber != null && ' · ' + c('Floor ', 'Tầng ') + s.floorNumber}
                        {' · ' +
                          (ended
                            ? c('Ended', 'Đã kết thúc')
                            : ongoing
                              ? c('Under maintenance', 'Đang bảo trì')
                              : c('Scheduled', 'Sắp bảo trì'))}
                      </p>
                    </div>
                    <Button
                      size='icon'
                      variant='ghost'
                      aria-label={c('Remove maintenance', 'Gỡ lịch bảo trì')}
                      onClick={() => {
                        setError('');
                        setRemove(s);
                      }}
                    >
                      <Trash2 className='size-4 text-destructive' />
                    </Button>
                  </div>
                  <p className='mt-3 text-xs tabular-nums'>
                    {formatDate(s.startTime)} →{' '}
                    {s.endTime
                      ? formatDate(new Date(Date.parse(s.endTime) - 1))
                      : c('Until removed', 'Đến khi gỡ lịch')}
                  </p>
                  <p className='mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground'>
                    {s.reason}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !busy) setRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c('Remove maintenance?', 'Gỡ lịch bảo trì?')}</DialogTitle>
            <DialogDescription>
              {remove?.name}.{' '}
              {c(
                'Other independent schedules remain in effect.',
                'Đối tượng tự khôi phục nếu không còn lịch bảo trì khác đang có hiệu lực.'
              )}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant='outline' disabled={busy} onClick={() => setRemove(null)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={async () => {
                if (!remove) return;
                setBusy(true);
                setError('');
                try {
                  await maintenanceApi.remove(workspaceId, remove.key);
                  setRemove(null);
                  await refresh();
                  toast.success(c('Maintenance removed', 'Đã gỡ lịch bảo trì'));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? c('Removing…', 'Đang gỡ…') : c('Remove', 'Gỡ lịch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
