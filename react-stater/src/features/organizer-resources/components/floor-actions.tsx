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
import { nextFloorNumber, isDuplicateFloorNumber } from '../utils/floor-number';

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
  const [action, setAction] = useState<'rename' | 'copy' | 'delete' | null>(null);
  const [target, setTarget] = useState(floor);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = (value: typeof action) => {
    setTarget(floor);
    setAction(value);
    setError('');
    setName(
      value === 'copy' ? `${floor.name} (${c('copy', 'bản sao')})`.slice(0, 100) : floor.name
    );
    setNumber(String(nextFloorNumber(floors) ?? ''));
  };
  const duplicate = action === 'copy' && isDuplicateFloorNumber(floors, number);
  async function save() {
    if (!action || busy || disabled) return;
    if (action !== 'delete' && (!name.trim() || name.trim().length > 100)) {
      setError(c('Enter a name up to 100 characters.', 'Nhập tên tối đa 100 ký tự.'));
      return;
    }
    if (
      action === 'copy' &&
      (!/^-?\d+$/.test(number) || Number(number) < -20 || Number(number) > 500 || duplicate)
    ) {
      setError(
        c(
          'Choose an unused floor number between -20 and 500.',
          'Chọn số tầng chưa sử dụng từ -20 đến 500.'
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
        created = await copyResourceFloor(workspaceId, target, name.trim(), Number(number));
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
            : c('Empty floor deleted.', 'Đã xóa tầng trống.')
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
          <DropdownMenuItem onSelect={() => open('rename')}>
            <Pencil className='size-4' />
            {c('Rename floor', 'Đổi tên tầng')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open('copy')}>
            <Copy className='size-4' />
            {c('Copy to a new floor', 'Sao chép sang tầng mới')}
          </DropdownMenuItem>
          <DropdownMenuItem className='text-destructive' onSelect={() => open('delete')}>
            <Trash2 className='size-4' />
            {c('Delete empty floor', 'Xóa tầng trống')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={!!action}
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
                  : c('Delete empty floor?', 'Xóa tầng trống?')}
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
                      'Deletion is permanent and allowed only when the floor has no resources (including archived ones), furniture, background or other layout data. Nothing is deleted automatically.',
                      'Xóa vĩnh viễn chỉ khi tầng không còn chỗ (kể cả đã lưu trữ), đồ bố trí, ảnh nền hoặc dữ liệu sơ đồ khác. Không tự xóa dữ liệu con.'
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
            {action === 'copy' && (
              <label className='block space-y-2 text-sm'>
                {c('New floor number', 'Số tầng mới')}
                <Input
                  inputMode='numeric'
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  disabled={busy}
                />
                {duplicate && (
                  <span className='text-xs text-destructive'>
                    {c('This floor number is already used.', 'Số tầng này đã được sử dụng.')}
                  </span>
                )}
              </label>
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
                disabled={busy || duplicate}
              >
                {busy && <LoaderCircle className='size-4 animate-spin' />}
                {action === 'delete'
                  ? c('Delete floor', 'Xóa tầng')
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
