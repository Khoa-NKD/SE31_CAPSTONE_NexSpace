import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useCreateMaintenanceLogMutation } from '@/features/workspaces/api/mutations';
import type { MaintenanceStatus, MaintenanceType, WorkspaceAssetDto } from '@/features/workspaces/api/types';
import { Loader2, Wrench } from 'lucide-react';

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
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('REPAIR');
  const [status, setStatus] = useState<MaintenanceStatus>('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [cost, setCost] = useState('');
  const [resultNote, setResultNote] = useState('');

  const createLogMutation = useCreateMaintenanceLogMutation();
  const isSubmitting = createLogMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !description.trim()) return;

    createLogMutation.mutate(
      {
        workspaceId,
        assetId: asset.id,
        payload: {
          maintenanceType,
          status,
          description: description.trim(),
          performedBy: performedBy.trim() || null,
          cost: cost ? Number(cost) : null,
          startedAt: status === 'IN_PROGRESS' ? new Date().toISOString() : null,
          resultNote: resultNote.trim() || null
        }
      },
      {
        onSuccess: () => {
          setDescription('');
          setPerformedBy('');
          setCost('');
          setResultNote('');
          onOpenChange(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg overflow-hidden'>
        <DialogHeader className='min-w-0 overflow-hidden pr-6'>
          <DialogTitle className='flex items-center gap-2 min-w-0'>
            <Wrench className='w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0' />
            <span className='truncate'>Báo hỏng / Lập lịch bảo trì: {asset?.name} ({asset?.assetCode})</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0'>
            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='maintenanceType' className='text-xs font-semibold'>
                Loại công việc <span className='text-rose-500'>*</span>
              </Label>
              <Select value={maintenanceType} onValueChange={(val: MaintenanceType) => setMaintenanceType(val)}>
                <SelectTrigger id='maintenanceType' className='w-full min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block'>
                  <SelectValue placeholder='Chọn loại công việc' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='REPAIR'>Sửa chữa sự cố (Repair)</SelectItem>
                  <SelectItem value='INSPECTION'>Kiểm tra định kỳ (Inspection)</SelectItem>
                  <SelectItem value='REPLACEMENT'>Thay thế linh kiện (Replacement)</SelectItem>
                  <SelectItem value='CLEANING'>Vệ sinh thiết bị (Cleaning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='logStatus' className='text-xs font-semibold'>
                Trạng thái xử lý
              </Label>
              <Select value={status} onValueChange={(val: MaintenanceStatus) => setStatus(val)}>
                <SelectTrigger id='logStatus' className='w-full min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block'>
                  <SelectValue placeholder='Chọn trạng thái' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='IN_PROGRESS'>Đang xử lý (Chuyển sang bảo trì)</SelectItem>
                  <SelectItem value='SCHEDULED'>Đã lên lịch (Chưa bắt đầu sửa)</SelectItem>
                  <SelectItem value='COMPLETED'>Đã hoàn thành ngay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='desc' className='text-xs font-semibold'>
              Mô tả sự cố / nội dung bảo dưỡng <span className='text-rose-500'>*</span>
            </Label>
            <Textarea
              id='desc'
              rows={3}
              placeholder='VD: Bóng đèn máy chiếu bị mờ chập chờn, cần gọi thợ kỹ thuật thay thế...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0'>
            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='performedBy' className='text-xs font-semibold'>
                Kỹ thuật viên / Đơn vị thực hiện
              </Label>
              <Input
                id='performedBy'
                className='w-full min-w-0'
                placeholder='VD: Trung tâm kỹ thuật Sony VN...'
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
              />
            </div>

            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='cost' className='text-xs font-semibold'>
                Chi phí ước tính / thực tế (VNĐ)
              </Label>
              <Input
                id='cost'
                type='number'
                min={0}
                className='w-full min-w-0'
                placeholder='VD: 850000'
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting || !description.trim()}
              className='bg-amber-600 hover:bg-amber-700 text-white'
            >
              {isSubmitting && <Loader2 className='w-4 h-4 animate-spin mr-2' />}
              Ghi nhận bảo trì
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

