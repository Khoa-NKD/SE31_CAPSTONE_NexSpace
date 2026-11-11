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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, AlertTriangle, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useUpdateUserStatusMutation } from '../api/mutations';
import type { AdminUserRecord } from '../api/types';

interface LockUserDialogProps {
  user: AdminUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LockUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: LockUserDialogProps) {
  const [reason, setReason] = useState('');
  const [durationMode, setDurationMode] = useState<'indefinite' | 'temporary'>('indefinite');
  const [lockedUntilInput, setLockedUntilInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatusMutation = useUpdateUserStatusMutation();

  if (!user) return null;

  const handleApplyPreset = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    setLockedUntilInput(`${year}-${month}-${day}T${hours}:${minutes}`);
    setErrorMessage(null);
  };

  const handleClose = () => {
    setReason('');
    setDurationMode('indefinite');
    setLockedUntilInput('');
    setErrorMessage(null);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('Lý do khóa tài khoản là bắt buộc. Vui lòng nhập lý do.');
      return;
    }

    if (trimmedReason.length > 255) {
      setErrorMessage('Lý do không được vượt quá 255 ký tự.');
      return;
    }

    let formattedLockedUntil: string | null = null;
    if (durationMode === 'temporary') {
      if (!lockedUntilInput) {
        setErrorMessage('Vui lòng chọn thời hạn khóa tài khoản.');
        return;
      }
      const selectedDate = new Date(lockedUntilInput);
      if (isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
        setErrorMessage('Thời hạn khóa phải là một thời điểm trong tương lai.');
        return;
      }
      // Convert to "yyyy-MM-dd HH:mm:ss" required by backend
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const hh = String(selectedDate.getHours()).padStart(2, '0');
      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
      const ss = String(selectedDate.getSeconds()).padStart(2, '0');
      formattedLockedUntil = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    }

    updateStatusMutation.mutate(
      {
        userId: user.id,
        nextStatus: 'Locked',
        userName: user.name,
        reason: trimmedReason,
        lockedUntil: formattedLockedUntil
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
                <Lock className='size-5' />
              </div>
              <DialogTitle className='text-lg font-heading text-foreground'>
                Khóa tài khoản người dùng
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              Tài khoản <strong className='text-foreground'>{user.name}</strong> ({user.email}) sẽ bị đình chỉ hoạt động và thu hồi toàn bộ phiên đăng nhập hiện tại.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-4 text-xs'>
            {errorMessage && (
              <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-xs'>
                <AlertTriangle className='size-4 shrink-0' />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Lý do khóa (Bắt buộc) */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='lock-reason' className='text-xs font-semibold text-foreground'>
                  Lý do khóa tài khoản <span className='text-destructive'>*</span>
                </Label>
                <span className='text-[10px] text-muted-foreground'>{reason.length}/255</span>
              </div>
              <Textarea
                id='lock-reason'
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder='Nhập lý do đình chỉ tài khoản (bắt buộc theo quy chuẩn kiểm toán BR-31)...'
                rows={3}
                maxLength={255}
                className='text-xs resize-none'
                required
              />
            </div>

            {/* Lựa chọn thời hạn khóa */}
            <div className='space-y-2 pt-1 border-t border-border'>
              <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                <Clock className='size-3.5 text-muted-foreground' />
                <span>Thời hạn khóa tài khoản</span>
              </Label>

              <RadioGroup
                value={durationMode}
                onValueChange={(val) => {
                  setDurationMode(val as 'indefinite' | 'temporary');
                  if (errorMessage) setErrorMessage(null);
                }}
                className='grid grid-cols-2 gap-2'
              >
                <label
                  htmlFor='lock-indefinite'
                  className={`flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer transition-colors ${
                    durationMode === 'indefinite'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value='indefinite' id='lock-indefinite' />
                  <span className='text-xs font-medium'>
                    Khóa vĩnh viễn
                  </span>
                </label>

                <label
                  htmlFor='lock-temporary'
                  className={`flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer transition-colors ${
                    durationMode === 'temporary'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value='temporary' id='lock-temporary' />
                  <span className='text-xs font-medium'>
                    Khóa có thời hạn
                  </span>
                </label>
              </RadioGroup>

              {/* Bộ chọn thời gian khi chọn khóa tạm thời */}
              {durationMode === 'temporary' && (
                <div className='p-3 rounded-lg border border-border bg-muted/30 space-y-2.5 mt-2 animate-in fade-in-50 duration-150'>
                  <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                    <span>Mốc thời gian nhanh:</span>
                    <div className='flex items-center gap-1'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleApplyPreset(1)}
                        className='h-6 text-[10px] px-2 py-0'
                      >
                        +1 Ngày
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleApplyPreset(3)}
                        className='h-6 text-[10px] px-2 py-0'
                      >
                        +3 Ngày
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleApplyPreset(7)}
                        className='h-6 text-[10px] px-2 py-0'
                      >
                        +7 Ngày
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleApplyPreset(30)}
                        className='h-6 text-[10px] px-2 py-0'
                      >
                        +30 Ngày
                      </Button>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label htmlFor='locked-until-picker' className='text-[11px] text-foreground font-medium flex items-center gap-1'>
                      <CalendarIcon className='size-3 text-primary' />
                      <span>Chọn ngày và giờ mở khóa tự động:</span>
                    </Label>
                    <input
                      id='locked-until-picker'
                      type='datetime-local'
                      value={lockedUntilInput}
                      onChange={(e) => {
                        setLockedUntilInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className='w-full text-xs font-mono px-3 py-1.5 rounded-md border border-border bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-primary'
                      min={new Date().toISOString().slice(0, 16)}
                      required={durationMode === 'temporary'}
                    />
                    <p className='text-[10px] text-muted-foreground'>
                      Hệ thống sẽ tự động mở khóa tài khoản sau thời điểm này (Múi giờ GMT+7).
                    </p>
                  </div>
                </div>
              )}
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
              <Lock className='size-3.5' />
              <span>{updateStatusMutation.isPending ? 'Đang khóa...' : 'Xác nhận khóa tài khoản'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
