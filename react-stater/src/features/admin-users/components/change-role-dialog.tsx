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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { UserCheck, ShieldAlert, AlertTriangle, Shield, User, Building2 } from 'lucide-react';
import { useUpdateUserRoleMutation } from '../api/mutations';
import type { AdminUserRecord, BackendUserRole } from '../api/types';

interface ChangeRoleDialogProps {
  user: AdminUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: ChangeRoleDialogProps) {
  if (!user || !open) return null;

  return (
    <ChangeRoleDialogContent
      key={`${user.id}-${user.role}`}
      user={user}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}

function ChangeRoleDialogContent({
  user,
  open,
  onOpenChange,
  onSuccess
}: {
  user: AdminUserRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const initialRole: BackendUserRole =
    user.role === 'Administrator' ? 'ADMIN' : user.role === 'Organizer' ? 'ORGANIZER' : 'USER';
  const [selectedRole, setSelectedRole] = useState<BackendUserRole>(initialRole);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateRoleMutation = useUpdateUserRoleMutation();

  const currentBackendRole: BackendUserRole =
    user.role === 'Administrator' ? 'ADMIN' : user.role === 'Organizer' ? 'ORGANIZER' : 'USER';

  const isRoleUnchanged = selectedRole === currentBackendRole;
  const isAssigningAdmin = selectedRole === 'ADMIN' && currentBackendRole !== 'ADMIN';
  const isDemotingAdmin = currentBackendRole === 'ADMIN' && selectedRole !== 'ADMIN';

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
      setErrorMessage('Lý do thay đổi vai trò là bắt buộc theo quy định kiểm toán. Vui lòng nhập lý do.');
      return;
    }

    if (trimmedReason.length > 255) {
      setErrorMessage('Lý do không được vượt quá 255 ký tự.');
      return;
    }

    if (isRoleUnchanged) {
      setErrorMessage('Vui lòng chọn một vai trò mới khác với vai trò hiện tại của người dùng.');
      return;
    }

    updateRoleMutation.mutate(
      {
        userId: user.id,
        role: selectedRole,
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
            <div className='flex items-center gap-2 text-primary font-semibold'>
              <div className='p-2 rounded-full bg-primary/10 text-primary'>
                <UserCheck className='size-5' />
              </div>
              <DialogTitle className='text-lg font-heading text-foreground'>
                Phân quyền &amp; Thay đổi vai trò
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              Gán vai trò mới cho tài khoản <strong className='text-foreground'>{user.name}</strong> ({user.email}). Sau khi đổi vai trò, hệ thống sẽ tự động đăng xuất tài khoản này trên mọi thiết bị và yêu cầu người dùng đăng nhập lại.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-4 text-xs'>
            {errorMessage && (
              <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-xs animate-in fade-in-50'>
                <AlertTriangle className='size-4 shrink-0' />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Thông tin vai trò hiện tại */}
            <div className='flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border'>
              <span className='text-xs text-muted-foreground font-medium'>Vai trò hiện tại:</span>
              <Badge variant='outline' className='text-xs font-semibold py-0.5 px-2 bg-background'>
                {user.role}
              </Badge>
            </div>

            {/* Chọn vai trò mới */}
            <div className='space-y-1.5'>
              <Label htmlFor='new-role-select' className='text-xs font-semibold text-foreground'>
                Chọn vai trò mới <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => {
                  setSelectedRole(val as BackendUserRole);
                  if (errorMessage) setErrorMessage(null);
                }}
              >
                <SelectTrigger id='new-role-select' className='w-full text-xs h-9 bg-background'>
                  <SelectValue placeholder='Chọn vai trò...' />
                </SelectTrigger>
                <SelectContent className='z-50'>
                  <SelectItem value='USER' className='text-xs flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <User className='size-3.5 text-emerald-600' />
                      <span>Khách hàng (Customer - USER)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='ORGANIZER' className='text-xs flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <Building2 className='size-3.5 text-blue-600' />
                      <span>Đối tác quản lý không gian (ORGANIZER)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='ADMIN' className='text-xs flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <Shield className='size-3.5 text-indigo-600' />
                      <span>Quản trị viên hệ thống (Administrator - ADMIN)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className='text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5'>
                <span className='inline-block size-1.5 rounded-full bg-amber-500' />
                <span>Toàn bộ phiên hoạt động trên các thiết bị khác sẽ bị đăng xuất ngay lập tức.</span>
              </p>
            </div>

            {/* Cảnh báo bảo mật khi nâng hoặc hạ quyền ADMIN */}
            {isAssigningAdmin && (
              <div className='p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5 text-xs animate-in fade-in-50'>
                <ShieldAlert className='size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5' />
                <div>
                  <p className='font-semibold'>Cảnh báo nâng quyền Quản trị viên:</p>
                  <p className='text-[11px] text-muted-foreground dark:text-indigo-300/80 mt-0.5'>
                    Tài khoản này sẽ được trao toàn bộ quyền điều hành, phê duyệt và quản trị dữ liệu cao nhất trên NexSpace.
                  </p>
                </div>
              </div>
            )}

            {isDemotingAdmin && (
              <div className='p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs animate-in fade-in-50'>
                <AlertTriangle className='size-4 text-amber-600 shrink-0 mt-0.5' />
                <div>
                  <p className='font-semibold'>Cảnh báo hạ quyền Quản trị viên:</p>
                  <p className='text-[11px] text-muted-foreground dark:text-amber-300/80 mt-0.5'>
                    Hệ thống yêu cầu phải còn ít nhất một Quản trị viên đang hoạt động. Nếu đây là Quản trị viên duy nhất, hành động sẽ bị từ chối.
                  </p>
                </div>
              </div>
            )}

            {/* Lý do thay đổi vai trò (Bắt buộc) */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='role-reason' className='text-xs font-semibold text-foreground'>
                  Lý do thay đổi vai trò <span className='text-destructive'>*</span>
                </Label>
                <span className='text-[10px] text-muted-foreground'>{reason.length}/255</span>
              </div>
              <Textarea
                id='role-reason'
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder='Nhập lý do thay đổi vai trò (bắt buộc, ví dụ: Phê duyệt nâng cấp thành đối tác Organizer)...'
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
              disabled={updateRoleMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={updateRoleMutation.isPending || isRoleUnchanged}
              className='gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90'
            >
              <UserCheck className='size-3.5' />
              <span>{updateRoleMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận đổi vai trò'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
