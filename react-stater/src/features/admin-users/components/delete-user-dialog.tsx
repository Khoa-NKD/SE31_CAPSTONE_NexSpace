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
import { Trash2, AlertTriangle } from 'lucide-react';
import { useUpdateUserStatusMutation } from '../api/mutations';
import type { AdminUserRecord } from '../api/types';

interface DeleteUserDialogProps {
  user: AdminUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Hộp thoại xác nhận xóa mềm tài khoản người dùng (DELETED).
 * Bắt buộc nhập lý do để ghi vết Audit Log; dữ liệu lịch sử vẫn được bảo toàn trong DB.
 */
export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: DeleteUserDialogProps) {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatusMutation = useUpdateUserStatusMutation();

  if (!user) return null;

  const handleClose = () => {
    setReason('');
    setErrorMessage(null);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('Lý do xóa mềm tài khoản là bắt buộc. Vui lòng nhập lý do.');
      return;
    }

    if (trimmedReason.length > 255) {
      setErrorMessage('Lý do không được vượt quá 255 ký tự.');
      return;
    }

    updateStatusMutation.mutate(
      {
        userId: user.id,
        nextStatus: 'DELETED',
        userName: user.name,
        reason: trimmedReason
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
            <div className='flex items-center gap-2 text-destructive font-semibold'>
              <div className='p-2 rounded-full bg-destructive/10 text-destructive'>
                <Trash2 className='size-5' />
              </div>
              <DialogTitle className='text-lg font-heading text-foreground'>
                Xóa mềm tài khoản người dùng
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              Tài khoản <strong className='text-foreground'>{user.name}</strong> ({user.email}) sẽ được chuyển sang trạng thái{' '}
              <strong className='text-destructive'>DELETED</strong>, thu hồi toàn bộ phiên đăng nhập và không thể đăng nhập lại (dữ liệu giao dịch lịch sử vẫn được giữ nguyên).
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-4 text-xs'>
            {errorMessage && (
              <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-xs'>
                <AlertTriangle className='size-4 shrink-0' />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className='p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2'>
              <AlertTriangle className='size-4 text-amber-600 shrink-0 mt-0.5' />
              <span>
                Thao tác này chỉ xóa mềm (*Soft Delete*). Bạn vẫn có thể khôi phục tài khoản về trạng thái hoạt động nếu cần thiết sau này.
              </span>
            </div>

            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='delete-reason' className='text-xs font-semibold text-foreground'>
                  Lý do xóa mềm <span className='text-destructive'>*</span>
                </Label>
                <span className='text-[10px] text-muted-foreground'>{reason.length}/255</span>
              </div>
              <Textarea
                id='delete-reason'
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder='Nhập lý do xóa mềm tài khoản (ví dụ: Người dùng yêu cầu đóng tài khoản, tài khoản vi phạm nghiêm trọng...)'
                rows={3}
                maxLength={255}
                className='text-xs resize-none'
                required
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
              variant='destructive'
              size='sm'
              disabled={updateStatusMutation.isPending}
              className='gap-1.5'
            >
              <Trash2 className='size-3.5' />
              <span>{updateStatusMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa mềm'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

