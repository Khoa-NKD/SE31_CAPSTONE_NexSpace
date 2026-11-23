import { useState } from 'react';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMaintenanceLogMutation } from '@/features/workspaces/api/mutations';
import type { WorkspaceAssetDto } from '@/features/workspaces/api/types';

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number | string;
  asset: WorkspaceAssetDto | null;
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  workspaceId,
  asset
}: MaintenanceDialogProps) {
  const c = useOrganizerCopy();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');
  const mutation = useCreateMaintenanceLogMutation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {c('Schedule maintenance', 'Lập lịch bảo trì')}: {asset?.name}
          </DialogTitle>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={(event) => {
            event.preventDefault();
            if (!asset) return;
            if (!start || !end || start >= end) {
              setError(c('End must be after start.', 'Kết thúc phải sau bắt đầu.'));
              return;
            }
            setError('');
            mutation.mutate(
              {
                workspaceId,
                assetId: asset.id,
                payload: {
                  maintenanceType: 'REPAIR',
                  status: 'SCHEDULED',
                  scheduledAt: start,
                  plannedEndAt: end,
                  description: description.trim(),
                  performedBy: performedBy.trim() || null,
                  cost: cost ? Number(cost) : null
                }
              },
              {
                onSuccess: () => {
                  setStart('');
                  setEnd('');
                  setDescription('');
                  setPerformedBy('');
                  setCost('');
                  onOpenChange(false);
                }
              }
            );
          }}
        >
          <label className='block space-y-1 text-sm'>
            {c('Start', 'Bắt đầu')} *
            <DateInput type='datetime-local' required value={start} onValueChange={setStart} />
          </label>
          <label className='block space-y-1 text-sm'>
            {c('End', 'Kết thúc')} *
            <DateInput type='datetime-local' required value={end} onValueChange={setEnd} />
          </label>
          <label className='block space-y-1 text-sm'>
            {c('Maintenance details', 'Nội dung bảo trì')} *
            <Textarea
              required
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='block space-y-1 text-sm'>
              {c('Technician / service provider', 'Kỹ thuật viên / đơn vị thực hiện')}
              <Input
                maxLength={100}
                value={performedBy}
                onChange={(event) => setPerformedBy(event.target.value)}
              />
            </label>
            <label className='block space-y-1 text-sm'>
              {c('Estimated / actual cost (VND)', 'Chi phí ước tính / thực tế (VNĐ)')}
              <Input
                type='number'
                min={0}
                step='0.01'
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </label>
          </div>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Equipment resumes automatically at the end of this period, unless its room is still under maintenance.',
              'Thiết bị tự hết bảo trì khi hết thời hạn, trừ khi phòng chứa nó vẫn đang bảo trì.'
            )}
          </p>
          {(error || mutation.error) && (
            <p role='alert' className='text-sm text-destructive'>
              {error || mutation.error?.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              {c('Cancel', 'Hủy')}
            </Button>
            <Button disabled={mutation.isPending || !description.trim()}>
              {mutation.isPending
                ? c('Saving…', 'Đang lưu…')
                : c('Save maintenance', 'Lưu lịch bảo trì')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
