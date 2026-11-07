import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers3,
  LoaderCircle,
  Check,
  Pencil,
  AlertCircle,
  Focus,
  Armchair,
  DoorOpen,
  Plus
} from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { floorLayoutOptions, publishResourceFloor, saveFloorDecorations } from '../api/resources';
import type { FloorDecoration } from '../api/resources';
import type { FloorOption } from '../api/resources';
import { FloorLayoutPreview } from './floor-layout-preview';

import { FloorDecorationEditor } from './floor-decoration-editor';
import { decorationPresets } from '../utils/decoration-presets';

export function ResourceFloorManager({
  initialFloorId,
  actorId,
  workspaceId,
  floors,
  writable,
  onClose,
  onSaved,
  onFix
}: {
  initialFloorId?: number;
  actorId: number;
  workspaceId: number;
  floors: FloorOption[];
  writable: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onFix: (id: number) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [floorId, setFloorId] = useState(initialFloorId ?? floors[0]?.id ?? 0);
  const [previewFocus, setPreviewFocus] = useState<{ key: string | null; sequence: number }>({
    key: null,
    sequence: 0
  });
  const focusObject = (key: string | null) =>
    setPreviewFocus((current) => ({ key, sequence: current.sequence + 1 }));
  const [decoration, setDecoration] = useState<FloorDecoration | null>(null);
  const [removingDecoration, setRemovingDecoration] = useState<FloorDecoration | null>(null);
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('800');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useApplicationNotice(success, error, busy);
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0
  });
  async function saveObjects(items: FloorDecoration[]) {
    if (!query.data || busy || !writable)
      throw new Error(c('Layout cannot be changed right now.', 'Hiện không thể thay đổi bố trí.'));
    setBusy(true);
    setError('');
    setConfirmed(false);
    try {
      await saveFloorDecorations(workspaceId, query.data, items, width, height);
      await onSaved();
      setSuccess(
        c(
          'Layout draft saved. Publish when ready.',
          'Đã lưu bố trí nháp. Publish để cập nhật bản đồ Customer.'
        )
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (query.data) {
      setWidth(query.data.width?.toString() ?? '1200');
      setHeight(query.data.height?.toString() ?? '800');
      setConfirmed(false);
    }
  }, [query.data]);
  const canvasWidth = Number(width) || 1200,
    canvasHeight = Number(height) || 800;
  const missing =
    query.data?.resources.filter(
      (item) => item.posX === null || item.posY === null || !item.width || !item.height
    ) ?? [];
  async function publish() {
    if (busy || !query.data) return;
    setError('');
    setSuccess('');
    if (
      !confirmed ||
      ![width, height].every((value) => /^\d{1,8}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 1)
    ) {
      setError(
        c(
          'Confirm positions and enter positive canvas dimensions (max 2 decimals).',
          'Xác nhận vị trí và nhập kích thước canvas dương, tối đa 2 số thập phân.'
        )
      );
      return;
    }
    setBusy(true);
    try {
      await publishResourceFloor(workspaceId, query.data, width, height);
      await onSaved();
      setSuccess(
        c(
          'Floor published. Enable resources separately when ready.',
          'Đã publish tầng. Bạn có thể bật từng ghế/phòng khi sẵn sàng.'
        )
      );
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[94dvh] overflow-y-auto rounded-2xl sm:max-w-6xl'>
        <DialogHeader className='border-b border-border/70 pb-4'>
          <DialogTitle className='flex items-center gap-2'>
            <Layers3 className='text-primary size-5' />
            {c('Floor layout & publishing', 'Sơ đồ tầng & xuất bản')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Explore the layout with zoom and pan, review each object, then publish when ready. Existing bookings and sale statuses remain unchanged.',
              'Phóng to, kéo vùng xem và kiểm tra từng đối tượng trước khi xuất bản. Booking và trạng thái nhận đặt hiện có được giữ nguyên.'
            )}
          </DialogDescription>
        </DialogHeader>
        {!floors.length ? (
          <p className='text-muted-foreground py-8 text-center'>
            {c('Add a floor first.', 'Vui lòng tạo tầng trước.')}
          </p>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-3'>
              <label className='space-y-2 text-sm font-medium'>
                <span>{c('Floor', 'Tầng')}</span>
                <select
                  className='border-input bg-background h-10 w-full rounded-md border px-3'
                  value={floorId}
                  disabled={busy}
                  onChange={(e) => {
                    setFloorId(Number(e.target.value));
                    focusObject(null);
                    setError('');
                  }}
                >
                  {floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.location
                        ? `${floor.location.buildingName} / ${floor.location.physicalFloorName} / `
                        : ''}
                      {floor.name} · {floor.status}
                    </option>
                  ))}
                </select>
              </label>
              {[
                [c('Canvas width (px)', 'Rộng canvas (px)'), width, setWidth],
                [c('Canvas height (px)', 'Cao canvas (px)'), height, setHeight]
              ].map(([label, value, setValue]) => (
                <label key={String(label)} className='space-y-2 text-sm font-medium'>
                  <span>{String(label)}</span>
                  <Input
                    inputMode='decimal'
                    value={String(value)}
                    disabled={
                      busy ||
                      !writable ||
                      !query.data?.editableLayout ||
                      !!query.data?.floor.location
                    }
                    onChange={(e) => {
                      (setValue as (v: string) => void)(e.target.value);
                      setConfirmed(false);
                    }}
                  />
                </label>
              ))}
            </div>
            {query.isPending ? (
              <p role='status' className='text-muted-foreground p-6'>
                {c('Loading floor…', 'Đang tải tầng…')}
              </p>
            ) : query.isError ? (
              <div role='alert' className='space-y-2'>
                <p className='text-destructive text-sm'>{query.error.message}</p>
                <Button variant='outline' onClick={() => void query.refetch()}>
                  {c('Try again', 'Thử lại')}
                </Button>
              </div>
            ) : (
              query.data && (
                <>
                  {!query.data.editableLayout && (
                    <p
                      role='alert'
                      className='border-border bg-muted text-muted-foreground rounded-lg border p-3 text-sm'
                    >
                      {c(
                        'This floor has an existing layout format or an editor draft. It is preserved; use its dedicated Floor Plan workflow to publish.',
                        'Tầng đã có sơ đồ định dạng khác hoặc bản đang chỉnh sửa. Dữ liệu được giữ nguyên; dùng luồng Floor Plan tương ứng để publish.'
                      )}
                    </p>
                  )}
                  <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]'>
                    <div className='min-w-0 space-y-4'>
                      <FloorLayoutPreview
                        key={floorId}
                        layout={query.data}
                        width={canvasWidth}
                        height={canvasHeight}
                        focus={previewFocus}
                        onFocus={focusObject}
                      />
                      <div className='space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div>
                            <h3 className='text-sm font-semibold'>
                              {c('Layout objects', 'Đồ bố trí')}
                            </h3>
                            <p className='mt-1 text-xs text-muted-foreground'>
                              {c(
                                'Tables, plants and partitions. Display only — never bookable.',
                                'Bàn, cây xanh, vách ngăn. Chỉ bố trí — không đặt chỗ hay tính giá.'
                              )}
                            </p>
                          </div>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={busy || !writable || !query.data.editableLayout}
                            onClick={() =>
                              setDecoration({
                                id: `decor-${crypto.randomUUID()}`,
                                kind: 'TABLE',
                                label: c('Table', 'Bàn'),
                                posX: 100,
                                posY: 100,
                                width: decorationPresets.TABLE.width,
                                height: decorationPresets.TABLE.height,
                                rotation: 0,
                                color: decorationPresets.TABLE.color
                              })
                            }
                          >
                            <Plus className='mr-1 size-3.5' />
                            {c('Add layout object', 'Thêm đồ bố trí')}
                          </Button>
                        </div>
                        {query.data.draftChanges && (
                          <Badge variant='secondary'>
                            {c('Unpublished layout draft', 'Bố trí nháp chưa publish')}
                          </Badge>
                        )}
                        <div className='grid gap-2 sm:grid-cols-2'>
                          {(query.data.decorations ?? []).map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${previewFocus.key === `decoration:${item.id}` ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}
                            >
                              <div className='min-w-0'>
                                <p className='truncate text-sm font-medium'>{item.label}</p>
                                <p className='text-xs text-muted-foreground'>
                                  {item.kind} · {item.width} × {item.height} px
                                </p>
                              </div>
                              <div className='flex gap-1'>
                                <Button
                                  type='button'
                                  size='icon'
                                  variant='ghost'
                                  className='size-8'
                                  aria-label={`${c('Focus', 'Phóng tới')} ${item.label}`}
                                  title={c('View on map', 'Xem trên sơ đồ')}
                                  onClick={() => focusObject(`decoration:${item.id}`)}
                                >
                                  <Focus className='size-4' />
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  disabled={busy || !writable}
                                  onClick={() => setDecoration(item)}
                                >
                                  {c('Edit', 'Sửa')}
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  className='text-destructive'
                                  disabled={busy || !writable}
                                  onClick={() => setRemovingDecoration(item)}
                                >
                                  {c('Remove', 'Xóa')}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className='space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm'>
                      <div className='flex items-center justify-between'>
                        <h3 className='flex items-center gap-2 text-sm font-semibold'>
                          <Layers3 className='size-4 text-primary' />
                          {c('Current resources', 'Các chỗ hiện tại')}
                        </h3>
                        <Badge variant='secondary'>{query.data.resources.length}</Badge>
                      </div>
                      {missing.length > 0 && (
                        <p className='text-destructive flex items-start gap-2 text-xs'>
                          <AlertCircle className='size-4 shrink-0' />
                          {missing.length}{' '}
                          {c(
                            'resources need coordinates and dimensions.',
                            'chỗ cần bổ sung tọa độ và kích thước.'
                          )}
                        </p>
                      )}
                      <ul className='max-h-[32rem] space-y-2.5 overflow-y-auto pr-1'>
                        {query.data.resources.map((item) => (
                          <li
                            key={item.id}
                            className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${previewFocus.key === `resource:${item.id}` ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:border-primary/20'}`}
                          >
                            <div className='min-w-0'>
                              <p className='flex items-center gap-2 truncate text-sm font-medium'>
                                {item.category === 'ROOM' ? (
                                  <DoorOpen className='size-4 shrink-0 text-muted-foreground' />
                                ) : (
                                  <Armchair className='size-4 shrink-0 text-primary' />
                                )}
                                {item.code}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {item.category === 'ROOM'
                                  ? c('Room', 'Phòng')
                                  : item.parentRoomId
                                    ? `${c('Inside', 'Trong phòng')}: ${query.data.resources.find((room) => room.id === item.parentRoomId)?.name ?? item.parentRoomId}`
                                    : c('Open area', 'Khu làm việc mở')}
                              </p>
                              <p className='text-muted-foreground mt-1 text-xs'>
                                {item.posX ?? '—'}, {item.posY ?? '—'} · {item.width ?? '—'} ×{' '}
                                {item.height ?? '—'}
                              </p>
                            </div>
                            <div className='flex shrink-0 flex-col gap-1'>
                              <Button
                                type='button'
                                size='icon'
                                variant='ghost'
                                className='size-8'
                                title={c('View on map', 'Xem trên sơ đồ')}
                                aria-label={`${c('Focus', 'Phóng tới')} ${item.code}`}
                                onClick={() => focusObject(`resource:${item.id}`)}
                              >
                                <Focus className='size-4' />
                              </Button>
                              <Button
                                size='icon'
                                variant='ghost'
                                disabled={busy || !writable || item.status === 'ARCHIVED'}
                                aria-label={`${c('Edit', 'Sửa')} ${item.code}`}
                                onClick={() => onFix(item.id)}
                              >
                                <Pencil className='size-4' />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {!query.data.resources.length && (
                        <p className='text-muted-foreground text-sm'>
                          {c(
                            'This floor is empty. You can publish its canvas and add draft resources later.',
                            'Tầng chưa có chỗ. Có thể publish canvas trước rồi thêm ghế/phòng nháp sau.'
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className='border-border flex items-start gap-3 rounded-lg border p-3 text-sm'>
                    <input
                      type='checkbox'
                      className='mt-0.5 size-4 accent-primary'
                      checked={confirmed}
                      disabled={busy || !writable || !query.data.editableLayout}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      {c(
                        'I have reviewed this floor and its current resource positions. Existing bookings and activation states will be preserved.',
                        'Tôi đã kiểm tra tầng và vị trí các chỗ hiện tại. Booking và trạng thái bật/tắt hiện có được giữ nguyên.'
                      )}
                    </span>
                  </label>
                </>
              )
            )}
            {error && (
              <p role='alert' className='text-destructive text-sm'>
                {error}
              </p>
            )}
            <div className='flex justify-end gap-3'>
              <Button variant='outline' disabled={busy} onClick={onClose}>
                {c('Close', 'Đóng')}
              </Button>
              <Button
                disabled={
                  busy ||
                  !writable ||
                  !query.data?.editableLayout ||
                  !confirmed ||
                  missing.length > 0
                }
                onClick={() => void publish()}
              >
                {busy ? (
                  <LoaderCircle className='size-4 animate-spin' />
                ) : (
                  <Check className='size-4' />
                )}
                {c('Validate & publish floor', 'Kiểm tra & publish tầng')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
      {decoration && (
        <FloorDecorationEditor
          workspaceId={workspaceId}
          floorId={floorId}
          item={decoration}
          onClose={() => setDecoration(null)}
          onSave={async (updated) => {
            const previous = query.data?.decorations ?? [];
            await saveObjects(
              previous.some((item) => item.id === updated.id)
                ? previous.map((item) => (item.id === updated.id ? updated : item))
                : [...previous, updated]
            );
          }}
        />
      )}
      {removingDecoration && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setRemovingDecoration(null);
          }}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>{c('Remove layout object?', 'Xóa đồ bố trí?')}</DialogTitle>
              <DialogDescription>
                {removingDecoration.label} —{' '}
                {c(
                  'No seats or bookings will be removed. Customer changes only after publishing.',
                  'Không xóa ghế hay booking. Bản đồ Customer chỉ đổi sau khi publish.'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={busy}
                onClick={() => setRemovingDecoration(null)}
              >
                {c('Cancel', 'Hủy')}
              </Button>
              <Button
                type='button'
                variant='destructive'
                disabled={busy}
                onClick={async () => {
                  try {
                    await saveObjects(
                      (query.data?.decorations ?? []).filter(
                        (item) => item.id !== removingDecoration.id
                      )
                    );
                    setRemovingDecoration(null);
                  } catch (failure) {
                    setError(
                      failure instanceof Error ? failure.message : 'Could not remove object'
                    );
                  }
                }}
              >
                {c('Remove', 'Xóa')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
