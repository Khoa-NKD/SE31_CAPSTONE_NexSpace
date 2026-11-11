import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Unlock, CheckCircle2 } from 'lucide-react';
import { useUpdateUserStatusMutation } from '../api/mutations';
import type { AdminUserRecord } from '../api/types';

interface UnlockUserDialogProps {
  user: AdminUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UnlockUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: UnlockUserDialogProps) {
  const [reason, setReason] = useState('');

  const updateStatusMutation = useUpdateUserStatusMutation();

  if (!user) return null;

  const upperStatus = String(user.status || '').toUpperCase();
  const isDeleted = upperStatus === 'DELETED';
  const isInactive = upperStatus === 'INACTIVE';

  const dialogTitle = isDeleted
    ? 'Khôi phục tài khoản người dùng'
    : isInactive
    ? 'Kích hoạt lại tài khoản người dùng'
    : 'Mở khóa tài khoản người dùng';

  const dialogDesc = isDeleted ? (
    <>
      Bạn có chắc chắn muốn khôi phục tài khoản đã xóa mềm <strong className='text-foreground'>{user.name}</strong> ({user.email}) về trạng thái hoạt động?
    </>
  ) : isInactive ? (
    <>
      Bạn có chắc chắn muốn kích hoạt lại tài khoản tạm ngưng <strong className='text-foreground'>{user.name}</strong> ({user.email}) sang trạng thái hoạt động?
    </>
  ) : (
    <>
      Bạn có chắc chắn muốn mở khóa cho tài khoản <strong className='text-foreground'>{user.name}</strong> ({user.email})? Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường.
    </>
  );

  const actionLabel = isDeleted
    ? 'Xác nhận khôi phục'
    : isInactive
    ? 'Xác nhận kích hoạt'
    : 'Xác nhận mở khóa';

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateStatusMutation.mutate(
      {
        userId: user.id,
        nextStatus: 'Active',
        userName: user.name,
        reason: reason.trim() || undefined,
        lockedUntil: null
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md bg-background border border-border shadow-2xl'>
        <form onSubmit={handleSubmit}>
          <DialogHeader className='space-y-1.5 pb-2 border-b border-border'>
            <div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold'>
              <div className='p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'>
                <Unlock className='size-5' />
              </div>
              <DialogTitle className='text-lg font-heading text-foreground'>
                {dialogTitle}
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              {dialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-3 text-xs'>
            <div className='p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-xs'>
              <CheckCircle2 className='size-4 shrink-0 text-emerald-600 mt-0.5' />
              <div>
                <p className='font-semibold'>Quy chuẩn nghiệp vụ mở khóa:</p>
                <p className='text-[11px] text-muted-foreground dark:text-emerald-400/80 mt-0.5'>
                  Khi mở khóa tài khoản, lý do là <strong>không bắt buộc</strong>. Toàn bộ bộ đếm đăng nhập sai và thời gian phạt trước đó sẽ được tự động làm mới.
                </p>
              </div>
            </div>

            {/* Lý do mở khóa (Tùy chọn) */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='unlock-reason' className='text-xs font-semibold text-foreground'>
                  Ghi chú / Lý do mở khóa <span className='text-muted-foreground font-normal'>(Tùy chọn)</span>
                </Label>
                <span className='text-[10px] text-muted-foreground'>{reason.length}/255</span>
              </div>
              <Textarea
                id='unlock-reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='Nhập ghi chú hoặc lý do mở khóa nếu có (ví dụ: Đã xác minh danh tính qua email)...'
                rows={3}
                maxLength={255}
                className='text-xs resize-none'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0 pt-3 border-t border-border'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleClose}
              disabled={updateStatusMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={updateStatusMutation.isPending}
              className='gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
            >
              <Unlock className='size-3.5' />
              <span>{updateStatusMutation.isPending ? 'Đang xử lý...' : actionLabel}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

