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
import { useAssetMaintenanceLogsQuery } from '@/features/workspaces/api/queries';
import { useUpdateMaintenanceLogMutation } from '@/features/workspaces/api/mutations';
import { MaintenanceStatusBadge, MaintenanceTypeBadge } from './asset-status-badge';
import type { MaintenanceLogDto, MaintenanceStatus, WorkspaceAssetDto } from '@/features/workspaces/api/types';
import { History, Wrench, CheckCircle, Loader2, Calendar } from 'lucide-react';

interface MaintenanceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number | string;
  asset: WorkspaceAssetDto | null;
  onOpenNewLog?: () => void;
}

export function MaintenanceHistoryDialog({
  open,
  onOpenChange,
  workspaceId,
  asset,
  onOpenNewLog
}: MaintenanceHistoryDialogProps) {
  const { data: logs = [], isLoading } = useAssetMaintenanceLogsQuery(
    workspaceId,
    asset?.id
  );

  const [selectedLogToUpdate, setSelectedLogToUpdate] = useState<MaintenanceLogDto | null>(null);
  const [updateStatus, setUpdateStatus] = useState<MaintenanceStatus>('COMPLETED');
  const [resultNote, setResultNote] = useState('');
  const [updateCost, setUpdateCost] = useState('');

  const updateLogMutation = useUpdateMaintenanceLogMutation();
  const isUpdating = updateLogMutation.isPending;

  const handleOpenUpdate = (log: MaintenanceLogDto) => {
    setSelectedLogToUpdate(log);
    setUpdateStatus(log.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED');
    setResultNote(log.resultNote || '');
    setUpdateCost(log.cost ? String(log.cost) : '');
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !selectedLogToUpdate) return;

    updateLogMutation.mutate(
      {
        workspaceId,
        assetId: asset.id,
        logId: selectedLogToUpdate.id,
        payload: {
          status: updateStatus,
          resultNote: resultNote.trim() || null,
          cost: updateCost ? Number(updateCost) : undefined,
          completedAt: updateStatus === 'COMPLETED' ? new Date().toISOString() : undefined
        }
      },
      {
        onSuccess: () => {
          setSelectedLogToUpdate(null);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden'>
        <DialogHeader className='min-w-0 overflow-hidden pr-6'>
          <div className='flex items-center justify-between min-w-0 gap-2'>
            <DialogTitle className='flex items-center gap-2 min-w-0'>
              <History className='w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0' />
              <span className='truncate'>Lịch sử bảo trì: {asset?.name} ({asset?.assetCode})</span>
            </DialogTitle>
            {onOpenNewLog && (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => {
                  onOpenChange(false);
                  onOpenNewLog();
                }}
                className='text-xs font-semibold'
              >
                <Wrench className='w-3.5 h-3.5 mr-1 text-amber-600' />
                Báo hỏng mới
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className='py-12 flex flex-col items-center justify-center text-muted-foreground gap-2'>
            <Loader2 className='w-6 h-6 animate-spin text-indigo-600' />
            <p className='text-sm'>Đang tải lịch sử bảo trì...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className='py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl my-2'>
            <CheckCircle className='w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80' />
            <p className='font-medium text-foreground'>Chưa có lịch sử bảo trì nào</p>
            <p className='text-xs mt-1'>Thiết bị này hoạt động bình thường và chưa phát sinh sự cố nào.</p>
          </div>
        ) : (
          <div className='space-y-4 my-2'>
            {logs.map((log) => (
              <div
                key={log.id}
                className='p-4 border border-border rounded-xl bg-card hover:bg-muted/30 transition-colors space-y-2.5'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <MaintenanceTypeBadge type={log.maintenanceType} />
                    <MaintenanceStatusBadge status={log.status} />
                  </div>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <Calendar className='w-3.5 h-3.5' />
                    <span>{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</span>
                  </div>
                </div>

                <p className='text-sm font-medium text-foreground leading-relaxed'>
                  {log.description}
                </p>

                <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50'>
                  <div>
                    <span className='font-semibold text-foreground/70'>Người báo: </span>
                    {log.reportedByName || 'Hệ thống'}
                  </div>
                  <div>
                    <span className='font-semibold text-foreground/70'>Đơn vị sửa: </span>
                    {log.performedBy || 'Nội bộ'}
                  </div>
                  <div>
                    <span className='font-semibold text-foreground/70'>Chi phí: </span>
                    {log.cost ? `${Number(log.cost).toLocaleString('vi-VN')} đ` : 'Chưa tính'}
                  </div>
                </div>

                {log.resultNote && (
                  <div className='text-xs bg-muted/60 p-2.5 rounded-lg border border-border/60 text-foreground'>
                    <span className='font-semibold text-emerald-600 dark:text-emerald-400'>Kết quả xử lý: </span>
                    {log.resultNote}
                  </div>
                )}

                {log.status !== 'COMPLETED' && log.status !== 'CANCELLED' && (
                  <div className='pt-1 flex justify-end'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => handleOpenUpdate(log)}
                      className='text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                    >
                      <CheckCircle className='w-3 h-3 mr-1' />
                      Cập nhật tiến độ / Hoàn tất
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Cập nhật tiến độ */}
        {selectedLogToUpdate && (
          <div className='p-4 mt-2 border-t-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-3'>
            <h4 className='text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300'>
              Cập nhật tiến độ: #{selectedLogToUpdate.id}
            </h4>
            <form onSubmit={handleSaveUpdate} className='space-y-3'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0'>
                <div className='space-y-1 min-w-0'>
                  <Label className='text-xs font-semibold'>Trạng thái</Label>
                  <Select value={updateStatus} onValueChange={(val: MaintenanceStatus) => setUpdateStatus(val)}>
                    <SelectTrigger className='w-full min-w-0 h-8 text-xs [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='IN_PROGRESS'>Đang xử lý (In Progress)</SelectItem>
                      <SelectItem value='COMPLETED'>Hoàn thành (Đưa thiết bị về sẵn sàng)</SelectItem>
                      <SelectItem value='CANCELLED'>Hủy bỏ (Cancelled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1 min-w-0'>
                  <Label className='text-xs font-semibold'>Chi phí thực tế (VNĐ)</Label>
                  <Input
                    className='h-8 text-xs w-full min-w-0'
                    type='number'
                    min={0}
                    value={updateCost}
                    onChange={(e) => setUpdateCost(e.target.value)}
                    placeholder='VD: 500000'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Ghi chú kết quả sau sửa chữa</Label>
                <Textarea
                  rows={2}
                  className='text-xs'
                  value={resultNote}
                  onChange={(e) => setResultNote(e.target.value)}
                  placeholder='VD: Đã thay bóng đèn mới, thử chiếu hình ảnh sắc nét, hoạt động ổn định...'
                />
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='h-8 text-xs'
                  onClick={() => setSelectedLogToUpdate(null)}
                >
                  Đóng
                </Button>
                <Button
                  type='submit'
                  size='sm'
                  disabled={isUpdating}
                  className='h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white'
                >
                  {isUpdating && <Loader2 className='w-3 h-3 animate-spin mr-1' />}
                  Lưu tiến độ
                </Button>
              </div>
            </form>
          </div>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

