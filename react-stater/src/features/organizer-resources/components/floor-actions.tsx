import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { BuildingAllocationFields } from './building-allocation-fields';
import { FloorAllocationDialog } from './floor-allocation-dialog';
import { buildingsOptions, allocationError, type AllocationInput } from '../api/buildings';
import { floorLayoutOptions } from '../api/resources';
import { useState } from 'react';
import { MoreHorizontal, Pencil, Copy, Trash2, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  renameResourceFloor,
  copyResourceFloor,
  deleteResourceFloor,
  type FloorOption
} from '../api/resources';

export function FloorActions({
  workspaceId,
  floor,
  floors,
  disabled,
  onSaved,
  onDeleted,
  onCopied
}: {
  workspaceId: number;
  floor: FloorOption;
  floors: FloorOption[];
  disabled?: boolean;
  onSaved: () => Promise<void>;
  onDeleted?: () => void;
  onCopied?: (floor: FloorOption) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [action, setAction] = useState<'rename' | 'copy' | 'delete' | 'map' | null>(null);
  const [target, setTarget] = useState(floor);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = (value: typeof action) => {
    setTarget(floor);
    setArea(null);
    setAction(value);
    setError('');
    setName(
      value === 'copy' ? `${floor.name} (${c('copy', 'bản sao')})`.slice(0, 100) : floor.name
    );
  };
  const actor = useAuthStore((s) => s.user?.id ?? 0);
  const [area, setArea] = useState<AllocationInput | null>(null);
  const locations = useQuery({ ...buildingsOptions(actor), enabled: action === 'copy' });
  const source = useQuery({
    ...floorLayoutOptions(actor, workspaceId, target.id),
    enabled: action === 'copy'
  });
  const physical = locations.data
    ?.flatMap((b) => b.floors)
    .find((f) => f.id === area?.buildingFloorId);
  const duplicate = !!area && !!physical && !!allocationError(area, physical, workspaceId);

  async function save() {
    if (!action || action === 'map' || busy || disabled) return;
    if (action !== 'delete' && (!name.trim() || name.trim().length > 100)) {
      setError(c('Enter a name up to 100 characters.', 'Nhập tên tối đa 100 ký tự.'));
      return;
    }
    if (action === 'copy' && (!area || !physical || !source.data || duplicate)) {
      setError(
        c(
          'Choose a destination physical floor and a valid workspace area.',
          'Chọn tầng vật lý đích và khu vực workspace hợp lệ.'
        )
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      let created: FloorOption | undefined;
      if (action === 'rename') await renameResourceFloor(workspaceId, target, name.trim());
      else if (action === 'copy')
        created = await copyResourceFloor(workspaceId, target, name.trim(), physical!.floorNumber, {
          ...area!,
          name: name.trim()
        });
      else {
        await deleteResourceFloor(workspaceId, target);
        onDeleted?.();
      }
      await onSaved();
      setAction(null);
      if (created) onCopied?.(created);
      toast.success(
        action === 'rename'
          ? c('Floor renamed.', 'Đã đổi tên tầng.')
          : action === 'copy'
            ? c(
                'Floor copied as draft. No bookings or calendar blocks were copied.',
                'Đã sao chép tầng nháp, không sao chép booking hay lịch khóa.'
              )
            : c('Workspace area removed from the floor.', 'Đã gỡ khu vực workspace khỏi tầng.')
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Cannot complete this action.', 'Không thể thực hiện thao tác.')
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='rounded-xl'
            disabled={disabled || busy}
            aria-label={c('Floor actions', 'Thao tác tầng')}
          >
            <MoreHorizontal className='size-4' />
            {c('Floor actions', 'Thao tác tầng')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {!floor.location && (
            <DropdownMenuItem onSelect={() => open('map')}>
              <Pencil className='size-4' />
              {c('Link physical floor', 'Liên kết tầng vật lý')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => open('rename')}>
            <Pencil className='size-4' />
            {c('Rename workspace layout', 'Đổi tên sơ đồ workspace')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open('copy')}>
            <Copy className='size-4' />
            {c('Copy to a new floor', 'Sao chép sang tầng mới')}
          </DropdownMenuItem>
          <DropdownMenuItem className='text-destructive' onSelect={() => open('delete')}>
            <Trash2 className='size-4' />
            {c('Remove workspace area from floor', 'Gỡ khu vực khỏi tầng')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {action === 'map' && (
        <FloorAllocationDialog
          workspaceId={workspaceId}
          current={target}
          floors={floors}
          onSaved={onSaved}
          onClose={() => setAction(null)}
        />
      )}
      <Dialog
        open={!!action && action !== 'map'}
        onOpenChange={(value) => {
          if (!value && !busy) setAction(null);
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {action === 'rename'
                ? c('Rename floor', 'Đổi tên tầng')
                : action === 'copy'
                  ? c('Copy floor layout', 'Sao chép bố trí tầng')
                  : c('Remove this workspace area?', 'Gỡ khu vực workspace này khỏi tầng?')}
            </DialogTitle>
            <DialogDescription>
              {action === 'rename'
                ? c(
                    'Only the name changes. Coordinates, approval, prices and bookings are preserved.',
                    'Chỉ thay tên; giữ nguyên tọa độ, trạng thái xuất bản, giá và booking.'
                  )
                : action === 'copy'
                  ? c(
                      'Copy the current organizer layout and resources into this workspace. The new floor and every seat/room start as DRAFT. Bookings and calendar blocks stay on the original floor.',
                      'Sao chép bố trí hiện tại cùng ghế/phòng trong workspace này. Tầng mới và mọi chỗ đều là nháp; booking và lịch khóa giữ tại tầng gốc.'
                    )
                  : c(
                      'Remove only this workspace’s empty layout. The physical floor and other workspaces remain intact.',
                      'Chỉ gỡ sơ đồ trống của workspace này. Tầng vật lý và các workspace khác được giữ nguyên.'
                    )}
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <p className='rounded-xl bg-muted px-3 py-2 text-xs font-medium'>
              {target.name} · {c('Floor', 'Tầng')} {target.floorNumber}
            </p>
            {action !== 'delete' && (
              <label className='block space-y-2 text-sm'>
                {c('Floor name', 'Tên tầng')}
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  disabled={busy}
                />
              </label>
            )}
            {action === 'copy' && source.isPending && (
              <p className='text-sm text-muted-foreground'>
                {c('Loading source canvas…', 'Đang tải sơ đồ gốc…')}
              </p>
            )}
            {action === 'copy' && source.isSuccess && (
              <BuildingAllocationFields
                workspaceId={workspaceId}
                disabled={busy}
                buildingId={
                  target.location?.buildingId ??
                  floors.find((f) => f.location)?.location?.buildingId
                }
                value={area}
                onChange={setArea}
                fixedSize={
                  source.data?.width && source.data.height
                    ? { width: source.data.width, height: source.data.height }
                    : undefined
                }
              />
            )}
            {action === 'copy' && source.isError && (
              <p role='alert' className='text-sm text-destructive'>
                {source.error.message}
              </p>
            )}
            {error && (
              <p role='alert' className='rounded-xl bg-destructive/5 p-3 text-xs text-destructive'>
                {error}
              </p>
            )}
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={busy}
                onClick={() => setAction(null)}
              >
                {c('Cancel', 'Hủy')}
              </Button>
              <Button
                type='submit'
                variant={action === 'delete' ? 'destructive' : 'default'}
                disabled={
                  busy || duplicate || (action === 'copy' && (!area || !physical || !source.data))
                }
              >
                {busy && <LoaderCircle className='size-4 animate-spin' />}
                {action === 'delete'
                  ? c('Remove area', 'Gỡ khu vực')
                  : action === 'copy'
                    ? c('Create draft copy', 'Tạo bản sao nháp')
                    : c('Save name', 'Lưu tên')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
