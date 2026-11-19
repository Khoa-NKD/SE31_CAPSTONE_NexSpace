import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  CalendarOff,
  Trash2,
  CalendarRange,
  Clock3,
  Armchair,
  Wrench,
  CalendarPlus,
  LockKeyhole
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
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
import { operationsApi, type BlockedSlot } from '@/features/organizer-operations/api';
import {
  useOperationsWorkspace,
  OperationsHeader,
  OperationsState,
  OperationMetrics,
  panelClass,
  selectClass
} from '@/features/organizer-operations/components/operations-shared';
import { localDate } from '@/features/organizer-analytics/format';
import { exportRows, floorNumbers } from '@/features/organizer-operations/format';
import { formatDateTime } from '@/lib/format';

export function BlockoutLiveView() {
  const c = useOrganizerCopy();
  const state = useOperationsWorkspace();
  const [from, setFrom] = useState(() => localDate(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return localDate(d);
  });
  const [remove, setRemove] = useState<BlockedSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validRange =
    !!from && !!to && from <= to && (Date.parse(to) - Date.parse(from)) / 86400000 < 366;
  const blocks = useQuery({
    queryKey: ['organizer-operations', state.actor, state.workspaceId, 'blocks', from, to],
    queryFn: ({ signal }) =>
      operationsApi.blocks(
        state.workspaceId!,
        `${from}T00:00:00`,
        `${nextDay(to)}T00:00:00`,
        signal
      ),
    enabled: !!state.workspaceId && validRange
  });
  const [now] = useState(() => new Date());
  const rows = blocks.data ?? [];
  const current = rows.filter((b) => new Date(b.endTime) > now);
  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 pb-10'>
      <OperationsHeader
        icon={<CalendarOff />}
        title={c('Booking blockouts', 'Lịch ngừng nhận đặt')}
        description={c(
          'Reserve downtime for maintenance or private use.',
          'Chặn nhận đặt khi bảo trì hoặc sử dụng riêng.'
        )}
        state={{
          ...state,
          setWorkspaceId: (id) => {
            setRemove(null);
            setError('');
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
                label: c('Blocks in selected dates', 'Lịch khóa trong khoảng đã chọn'),
                value: rows.length,
                icon: CalendarRange,
                unit: c('entries', 'lịch')
              },
              {
                label: c('Upcoming / ongoing', 'Sắp tới / đang diễn ra'),
                value: current.length,
                icon: Clock3,
                unit: c('entries', 'lịch')
              },
              {
                label: c('Affected seats / rooms', 'Ghế / phòng bị khóa trực tiếp'),
                value: new Set(current.map((b) => b.resourceId)).size,
                icon: Armchair,
                unit: c('resources', 'chỗ')
              },
              {
                label: c('Maintenance entries', 'Lịch bảo trì'),
                value: current.filter((b) => b.blockType === 'MAINTENANCE').length,
                icon: Wrench,
                unit: c('entries', 'lịch')
              }
            ]}
          />
          <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]'>
            <section className={panelClass}>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <h2 className='flex items-center gap-2.5 font-semibold'>
                  <span className='organizer-section-icon'>
                    <CalendarRange className='size-4' />
                  </span>
                  {c('Blocked time slots', 'Các khung giờ ngừng nhận đặt')}
                </h2>
                <Button
                  variant='outline'
                  disabled={!rows.length}
                  onClick={() =>
                    exportRows('lich-ngung-nhan-dat.csv', [
                      ['Resource', 'Floor', 'Start', 'End', 'Reason'],
                      ...rows.map((b) => [
                        b.resourceName,
                        b.floorNumber,
                        formatDateTime(b.startTime),
                        formatDateTime(b.endTime),
                        b.reason
                      ])
                    ])
                  }
                >
                  <Download className='size-4' />
                  CSV
                </Button>
              </div>
              <div className='organizer-toolbar mt-4 items-end'>
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
                  {c(
                    'Choose a valid range up to 366 days.',
                    'Chọn khoảng ngày hợp lệ, tối đa 366 ngày.'
                  )}
                </p>
              )}
              {blocks.isPending && validRange && (
                <p role='status' className='py-6 text-sm'>
                  {c('Loading blocked slots…', 'Đang tải lịch khóa…')}
                </p>
              )}
              {blocks.error && (
                <div role='alert' className='mt-4 text-sm text-destructive'>
                  {blocks.error.message}
                  <Button variant='outline' onClick={() => void blocks.refetch()}>
                    {c('Retry', 'Thử lại')}
                  </Button>
                </div>
              )}
              {!blocks.isPending && !blocks.error && validRange && !rows.length && (
                <div className='mt-4 rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center text-muted-foreground'>
                  <CalendarOff className='mx-auto mb-3 size-8' />
                  <p>
                    {c(
                      'No blockouts in these dates.',
                      'Chưa có lịch ngừng nhận đặt trong khoảng ngày này.'
                    )}
                  </p>
                </div>
              )}
              <div className='mt-4 max-h-[650px] space-y-3 overflow-auto'>
                {rows.map((b) => (
                  <article
                    key={b.id}
                    className='rounded-xl border border-border/80 bg-muted/10 p-4 transition-colors hover:border-primary/25'
                  >
                    <div className='flex justify-between gap-3'>
                      <div>
                        <p className='flex items-center gap-2 text-sm font-semibold'>
                          {b.blockType === 'MAINTENANCE' ? (
                            <Wrench className='size-4 text-amber-600 dark:text-amber-400' />
                          ) : (
                            <LockKeyhole className='size-4 text-primary' />
                          )}
                          {b.resourceName}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {c('Floor', 'Tầng')} {b.floorNumber} ·{' '}
                          {b.blockType === 'MAINTENANCE'
                            ? c('Maintenance', 'Bảo trì')
                            : c('Private use / unavailable', 'Dùng riêng / ngừng nhận đặt')}
                          {new Date(b.endTime) <= now && ` · ${c('Ended', 'Đã kết thúc')}`}
                        </p>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={c('Remove blockout', 'Gỡ lịch khóa')}
                        onClick={() => {
                          setError('');
                          setRemove(b);
                        }}
                      >
                        <Trash2 className='size-4 text-destructive' />
                      </Button>
                    </div>
                    <p className='mt-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs font-medium tabular-nums'>
                      {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                    </p>
                    <p className='mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground'>
                      {b.reason}
                    </p>
                  </article>
                ))}
              </div>
            </section>
            <BlockCreation
              key={state.workspaceId}
              state={state}
              saved={async () => {
                await state.invalidate();
                await blocks.refetch();
              }}
            />
          </div>
        </>
      )}
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !busy) setRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c('Remove this blockout?', 'Gỡ khung giờ ngừng nhận đặt?')}</DialogTitle>
            <DialogDescription>
              {remove?.resourceName}.{' '}
              {c(
                'New bookings may use this time again, subject to operating hours and availability.',
                'Khách có thể đặt lại khung giờ này nếu đáp ứng giờ hoạt động và các điều kiện còn lại.'
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
              {c('Keep blockout', 'Giữ lịch khóa')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={async () => {
                if (!remove || !state.workspaceId) return;
                setBusy(true);
                try {
                  await operationsApi.deleteBlock(state.workspaceId, remove.id);
                  await state.invalidate();
                  setRemove(null);
                  toast.success(c('Blockout removed', 'Đã gỡ lịch khóa'));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {c('Remove', 'Gỡ lịch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function nextDay(value: string) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return localDate(d);
}

function BlockCreation({
  state,
  saved
}: {
  state: ReturnType<typeof useOperationsWorkspace>;
  saved: () => Promise<void>;
}) {
  const c = useOrganizerCopy();
  const [selected, setSelected] = useState<number[]>([]);
  const [floor, setFloor] = useState('all');
  const [search, setSearch] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [kind, setKind] = useState<'BLOCKED' | 'MAINTENANCE'>('MAINTENANCE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resources =
    state.pricing.data?.resources.filter((r) => r.status === 'ACTIVE' || r.status === 'DRAFT') ??
    [];
  const shown = resources.filter(
    (r) =>
      (floor === 'all' || r.floorNumber === Number(floor)) &&
      `${r.name} ${r.code}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  return (
    <section className={panelClass}>
      <h2 className='flex items-center gap-2.5 font-semibold'>
        <span className='organizer-section-icon'>
          <CalendarPlus className='size-4' />
        </span>
        {c('Create blockout', 'Tạo lịch ngừng nhận đặt')}
      </h2>
      <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>
        {c(
          'Blocking a room also blocks its seats. A blocked seat makes the whole room unavailable. Existing bookings and active holds cannot be overwritten.',
          'Khóa phòng cũng chặn ghế bên trong. Khóa một ghế trong phòng khiến phòng không thể được đặt trọn. Không ghi đè booking hoặc giữ chỗ đang có hiệu lực.'
        )}
      </p>
      <form
        className='mt-4 space-y-4'
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (!selected.length || selected.length > 200) {
            setError(c('Select 1–200 seats / rooms.', 'Chọn từ 1 đến 200 ghế/phòng.'));
            return;
          }
          if (!start || !end || start >= end || new Date(start) <= new Date()) {
            setError(
              c(
                'Choose a future start and an end after it.',
                'Chọn giờ bắt đầu trong tương lai và kết thúc sau bắt đầu.'
              )
            );
            return;
          }
          setBusy(true);
          try {
            await operationsApi.createBlocks(state.workspaceId!, {
              resourceIds: selected,
              startTime: start,
              endTime: end,
              blockType: kind,
              reason
            });
            await saved();
            setSelected([]);
            setReason('');
            toast.success(c('Blockout saved', 'Đã lưu lịch ngừng nhận đặt'));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className='flex gap-2'>
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c('Search…', 'Tìm ghế/phòng…')}
          />
        </div>
        <div className='overflow-hidden rounded-xl border'>
          <div className='flex items-center justify-between gap-2 border-b px-3 py-2 text-xs'>
            <span>
              {c('Selected', 'Đã chọn')}: {selected.length}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() =>
                setSelected(
                  shown.every((r) => selected.includes(r.id))
                    ? selected.filter((id) => !shown.some((r) => r.id === id))
                    : [...new Set([...selected, ...shown.map((r) => r.id)])]
                )
              }
            >
              {c('Toggle visible', 'Chọn / bỏ nhóm đang hiện')}
            </Button>
          </div>
          <div className='max-h-52 space-y-1 overflow-auto p-2'>
            {shown.map((r) => (
              <label
                key={r.id}
                className='flex cursor-pointer items-start gap-2 rounded-lg p-2 text-sm hover:bg-muted'
              >
                <input
                  className='mt-1'
                  type='checkbox'
                  checked={selected.includes(r.id)}
                  onChange={(e) =>
                    setSelected((p) =>
                      e.target.checked ? [...p, r.id] : p.filter((id) => id !== r.id)
                    )
                  }
                />
                <span>
                  {r.name || r.code}
                  <span className='block text-xs text-muted-foreground'>
                    {r.code} · {c('Floor', 'Tầng')} {r.floorNumber}
                    {r.parentRoomId && ` · ${c('Inside a room', 'Thuộc phòng')}`}
                  </span>
                </span>
              </label>
            ))}
            {!shown.length && (
              <p className='p-3 text-xs text-muted-foreground'>
                {c('No eligible resources.', 'Chưa có ghế/phòng phù hợp để khóa lịch.')}
              </p>
            )}
          </div>
        </div>
        <label className='block space-y-1 text-sm'>
          {c('Start', 'Bắt đầu')} *
          <DateInput type='datetime-local' required value={start} onValueChange={setStart} />
        </label>
        <label className='block space-y-1 text-sm'>
          {c('End', 'Kết thúc')} *
          <DateInput type='datetime-local' required value={end} onValueChange={setEnd} />
        </label>
        <label className='block space-y-1 text-sm'>
          {c('Blockout type', 'Loại lịch khóa')}
          <select
            className={`${selectClass} w-full`}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value='MAINTENANCE'>{c('Maintenance', 'Bảo trì')}</option>
            <option value='BLOCKED'>
              {c('Private use / unavailable', 'Sử dụng riêng / ngừng nhận đặt')}
            </option>
          </select>
        </label>
        <label className='block space-y-1 text-sm'>
          {c('Reason', 'Lý do')} *
          <Input
            required
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
        <Button className='w-full' disabled={busy || !resources.length}>
          {busy ? c('Saving…', 'Đang lưu…') : c('Save blockout', 'Lưu lịch ngừng nhận đặt')}
        </Button>
      </form>
    </section>
  );
}
