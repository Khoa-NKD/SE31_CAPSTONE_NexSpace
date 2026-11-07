import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Layers3,
  MapPin,
  LoaderCircle,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  buildingsOptions,
  saveBuilding,
  savePhysicalFloor,
  removeLocation,
  type Building,
  type PhysicalFloor
} from '../api/buildings';
import { invalidateResources } from '../api/resources';

type Edit =
  | { kind: 'building'; current?: Building }
  | { kind: 'floor'; building: Building; current?: PhysicalFloor }
  | { kind: 'delete-building'; current: Building }
  | { kind: 'delete-floor'; current: PhysicalFloor };
export function BuildingCatalog({
  compact = false,
  onChanged,
  onOpen
}: {
  compact?: boolean;
  onChanged?: () => void;
  onOpen?: (workspaceId: number, floorPlanId: number) => void;
}) {
  const actor = useAuthStore((s) => s.user?.id ?? 0);
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const query = useQuery({ ...buildingsOptions(actor), enabled: actor > 0 });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('1');
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('800');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = (next: Edit) => {
    setEdit(next);
    setError('');
    setName(next.current?.name ?? '');
    if (next.kind === 'building') setAddress(next.current?.address ?? '');
    if (next.kind === 'floor') {
      setNumber(
        String(
          next.current?.floorNumber ??
            Math.max(0, ...next.building.floors.map((f) => f.floorNumber)) + 1
        )
      );
      setWidth(String(next.current?.width ?? 1200));
      setHeight(String(next.current?.height ?? 800));
    }
  };
  const save = async () => {
    if (!edit || busy) return;
    setError('');
    if (!edit.kind.startsWith('delete') && !name.trim()) {
      setError(c('Enter a name.', 'Nhập tên.'));
      return;
    }
    if (
      edit.kind === 'floor' &&
      (!/^-?\d+$/.test(number) ||
        Number(number) < -20 ||
        Number(number) > 500 ||
        ![Number(width), Number(height)].every((v) => Number.isFinite(v) && v >= 1 && v <= 100000))
    ) {
      setError(c('Check the floor number and dimensions.', 'Kiểm tra số tầng và kích thước.'));
      return;
    }
    if (edit.kind === 'building' && !address.trim()) {
      setError(c('Enter the building address.', 'Nhập địa chỉ tòa nhà.'));
      return;
    }
    setBusy(true);
    try {
      if (edit.kind === 'building')
        await saveBuilding({ name: name.trim(), address: address.trim() }, edit.current);
      else if (edit.kind === 'floor')
        await savePhysicalFloor(
          edit.building.id,
          {
            name: name.trim(),
            floorNumber: Number(number),
            width: Number(width),
            height: Number(height)
          },
          edit.current
        );
      else
        await removeLocation(edit.kind === 'delete-building' ? 'building' : 'floor', edit.current);
      await invalidateResources(client, actor);
      onChanged?.();
      setEdit(null);
      toast.success(c('Building data saved.', 'Đã cập nhật dữ liệu tòa nhà.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : c('Unable to save.', 'Không thể lưu.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className='space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='rounded-xl bg-primary/10 p-2.5 text-primary'>
            <Building2 className='size-5' />
          </div>
          <div>
            <h2 className='font-semibold'>
              {c('Buildings & shared floors', 'Tòa nhà & tầng dùng chung')}
            </h2>
            <p className='text-xs text-muted-foreground'>
              {c(
                'One physical identity. Separate workspace areas and resources.',
                'Một định danh vật lý. Phân biệt khu vực, ghế/phòng theo workspace.'
              )}
            </p>
          </div>
        </div>
        <Button type='button' size='sm' onClick={() => open({ kind: 'building' })}>
          <Plus className='size-4' />
          {c('Building', 'Tòa nhà')}
        </Button>
      </header>
      {query.isPending && <LoaderCircle className='size-5 animate-spin' />}
      {query.isError && (
        <div role='alert' className='text-sm text-destructive'>
          {query.error.message}
          <Button type='button' variant='ghost' onClick={() => void query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      )}
      {query.data?.length === 0 && (
        <p className='rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
          {c(
            'Add a building, then create its physical floors. Existing workspace layouts remain intact until you map them.',
            'Thêm tòa nhà rồi tạo các tầng vật lý. Sơ đồ workspace cũ được giữ nguyên cho tới khi bạn liên kết chúng.'
          )}
        </p>
      )}
      <div className={compact ? 'space-y-3' : 'grid gap-4 xl:grid-cols-2'}>
        {query.data?.map((b) => (
          <article key={b.id} className='min-w-0 rounded-xl border border-border bg-muted/10'>
            <div className='flex items-start justify-between gap-3 p-4'>
              <div className='min-w-0'>
                <h3 className='truncate font-semibold'>{b.name}</h3>
                <p className='mt-1 flex gap-1.5 text-xs text-muted-foreground'>
                  <MapPin className='size-3.5 shrink-0' />
                  {b.address}
                </p>
              </div>
              <div className='flex shrink-0 gap-1'>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  aria-label={c('Edit building', 'Sửa tòa nhà')}
                  onClick={() => open({ kind: 'building', current: b })}
                >
                  <Pencil className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  disabled={b.floors.length > 0}
                  aria-label={c('Delete empty building', 'Xóa tòa nhà trống')}
                  onClick={() => open({ kind: 'delete-building', current: b })}
                >
                  <Trash2 className='size-3.5 text-destructive' />
                </Button>
              </div>
            </div>
            <div className='space-y-2 border-t border-border p-3'>
              {b.floors.map((f) => (
                <div key={f.id} className='rounded-lg border border-border bg-background p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='flex items-center gap-2 text-sm font-medium'>
                      <Layers3 className='size-4 text-primary' />
                      {f.floorNumber} · {f.name}
                    </p>
                    <div className='flex gap-1'>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        aria-label={c('Edit physical floor', 'Sửa tầng vật lý')}
                        onClick={() => open({ kind: 'floor', building: b, current: f })}
                      >
                        <Pencil className='size-3.5' />
                      </Button>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        disabled={f.occupants.length > 0}
                        aria-label={c('Delete unused physical floor', 'Xóa tầng chưa sử dụng')}
                        onClick={() => open({ kind: 'delete-floor', current: f })}
                      >
                        <Trash2 className='size-3.5 text-destructive' />
                      </Button>
                    </div>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {f.width} × {f.height} px · {f.occupants.length} workspace
                  </p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {f.occupants.map((o) => (
                      <button
                        key={o.floorPlanId}
                        type='button'
                        disabled={!onOpen}
                        onClick={() => onOpen?.(o.workspaceId, o.floorPlanId)}
                        className='flex max-w-full items-center gap-1 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-xs text-primary disabled:cursor-default'
                      >
                        <span className='truncate'>
                          {o.workspaceName || `Workspace #${o.workspaceId}`} · {o.layoutName}
                        </span>
                        {onOpen && <ArrowUpRight className='size-3 shrink-0' />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                className='w-full border-dashed'
                size='sm'
                onClick={() => open({ kind: 'floor', building: b })}
              >
                <Plus className='size-4' />
                {c('Add physical floor', 'Thêm tầng vật lý')}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v && !busy) setEdit(null);
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {edit?.kind.startsWith('delete')
                ? c('Delete unused location', 'Xóa vị trí chưa sử dụng')
                : edit?.kind === 'building'
                  ? c('Building details', 'Thông tin tòa nhà')
                  : c('Physical floor details', 'Thông tin tầng vật lý')}
            </DialogTitle>
            <DialogDescription>
              {c(
                'Shared physical records belong to the Organizer. Workspace layout names and booking data remain separate.',
                'Tòa nhà, tầng vật lý do Organizer quản lý. Tên sơ đồ từng workspace và dữ liệu booking được giữ riêng.'
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {edit?.kind.startsWith('delete') ? (
              <p className='text-sm'>
                {c(
                  'Delete this unused record permanently? A location used by a workspace cannot be deleted.',
                  'Xóa vĩnh viễn bản ghi chưa sử dụng này? Không thể xóa vị trí đang được workspace sử dụng.'
                )}{' '}
                <strong>{edit.current?.name}</strong>
              </p>
            ) : (
              <>
                <label className='block space-y-2 text-sm'>
                  {c('Name', 'Tên')}
                  <Input
                    value={name}
                    maxLength={edit?.kind === 'building' ? 150 : 100}
                    disabled={busy}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {edit?.kind === 'building' ? (
                  <label className='block space-y-2 text-sm'>
                    {c('Address', 'Địa chỉ')}
                    <Input
                      value={address}
                      maxLength={500}
                      disabled={busy}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <div className='grid grid-cols-3 gap-3'>
                      {[
                        [c('Floor number', 'Số tầng'), number, setNumber],
                        [c('Width (px)', 'Rộng (px)'), width, setWidth],
                        [c('Height (px)', 'Cao (px)'), height, setHeight]
                      ].map(([label, v, setter]) => (
                        <label key={String(label)} className='space-y-2 text-xs'>
                          {String(label)}
                          <Input
                            type='number'
                            disabled={
                              busy || (edit?.kind === 'floor' && !!edit.current?.occupants.length)
                            }
                            value={String(v)}
                            onChange={(e) => (setter as (value: string) => void)(e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {c(
                        'Floor numbers are unique within a building. Dimensions cannot change once a workspace is attached.',
                        'Số tầng duy nhất trong tòa nhà. Không đổi kích thước khi đã có workspace sử dụng.'
                      )}
                    </p>
                  </>
                )}
              </>
            )}
            {error && (
              <p role='alert' className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
                {error}
              </p>
            )}
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' disabled={busy} onClick={() => setEdit(null)}>
                {c('Cancel', 'Hủy')}
              </Button>
              <Button
                type='submit'
                disabled={busy}
                variant={edit?.kind.startsWith('delete') ? 'destructive' : 'default'}
              >
                {busy && <LoaderCircle className='size-4 animate-spin' />}
                {c('Confirm', 'Xác nhận')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
