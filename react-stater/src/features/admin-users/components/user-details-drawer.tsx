import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  X,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle2,
  Shield,
  BadgeCheck,
  User,
  UserCog,
  Activity,
  AlertTriangle,
  Calendar,
  Trash2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUserRecord } from '../api/types';
import { getUserInitial } from '../api/service';
import { useUpdateUserStatusMutation } from '../api/mutations';
import { LockUserDialog } from './lock-user-dialog';
import { UnlockUserDialog } from './unlock-user-dialog';
import { ChangeRoleDialog } from './change-role-dialog';
import { DeleteUserDialog } from './delete-user-dialog';

interface UserDetailsDrawerProps {
  user: AdminUserRecord | null;
  onClose: () => void;
  onToggleStatus?: (userId: string) => void;
  isUpdatingStatus?: boolean;
}

export function UserDetailsDrawer({
  user,
  onClose,
  onToggleStatus: _onToggleStatus,
  isUpdatingStatus = false
}: UserDetailsDrawerProps) {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const drawerStatusMutation = useUpdateUserStatusMutation();

  useEffect(() => {
    if (user) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [user]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (
        e.key === 'Escape' &&
        !resetModalOpen &&
        !lockModalOpen &&
        !unlockModalOpen &&
        !roleModalOpen &&
        !deleteModalOpen
      ) {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    if (user) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, resetModalOpen, lockModalOpen, unlockModalOpen, roleModalOpen, deleteModalOpen, onClose]);

  if (!user) return null;

  const rawStatusUpper = String(user.status || '').toUpperCase();
  const isLocked = rawStatusUpper === 'LOCKED';
  const isActive = rawStatusUpper === 'ACTIVE';
  const isInactive = rawStatusUpper === 'INACTIVE';
  const isDeleted = rawStatusUpper === 'DELETED';
  const displayName = user.name || user.fullName || user.userName || user.email || `User #${user.id}`;
  const displayCompany = user.company || (user.role === 'Organizer' ? 'Nhà tổ chức' : user.role === 'Administrator' ? 'Quản trị viên' : 'Thành viên');
  const displayDate = user.registeredDate && user.registeredDate !== '—'
    ? user.registeredDate
    : user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
    : '—';
  const displayTime = user.registeredTimeUtc || (user.createdAt
    ? new Date(user.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '');

  const handlePasswordReset = () => {
    setResetModalOpen(false);
    toast.success(`Password Reset Link Dispatched (Simulated)`, {
      description: `Dispatched cryptographically sealed one-time login link to ${user.email}.`
    });
  };

  return (
    <>
      {/* Semi-transparent backdrop blur overlay */}
      <div
        onClick={onClose}
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-150'
        aria-hidden='true'
      />

      {/* Slide-over Detail Drawer (560px Wide) */}
      <aside
        className='fixed right-0 top-0 bottom-0 h-full w-full max-w-[560px] bg-background shadow-2xl z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-200'
        role='dialog'
        aria-label={`User Details: ${user.name}`}
      >
        {/* Drawer Header (Sticky) */}
        <div className='px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10'>
          <div className='flex items-center gap-3'>
            <Avatar className='size-12 rounded-full border-2 border-indigo-200 dark:border-indigo-800 shadow-2xs relative shrink-0'>
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={displayName}
                  className='w-full h-full object-cover'
                />
              ) : null}
              <AvatarFallback className='rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 font-bold text-base select-none'>
                {getUserInitial(displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-lg font-bold font-heading text-foreground'>
                  {displayName}
                </h2>
                <Badge
                  variant='outline'
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : isLocked
                      ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : isInactive
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : isDeleted
                      ? 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 line-through'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full mr-1 ${
                      isActive
                        ? 'bg-emerald-500'
                        : isLocked
                        ? 'bg-red-500'
                        : isInactive
                        ? 'bg-amber-500'
                        : isDeleted
                        ? 'bg-slate-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {isActive
                    ? 'Hoạt động'
                    : isLocked
                    ? 'Đã khóa'
                    : isInactive
                    ? 'Tạm ngưng (INACTIVE)'
                    : isDeleted
                    ? 'Đã xóa (DELETED)'
                    : user.status}
                </Badge>
              </div>
              <p className='text-xs font-mono text-muted-foreground mt-0.5'>
                {user.id} • Ngày tham gia: {displayDate}
              </p>
            </div>
          </div>

          {/* Close button with ESC hint */}
          <div className='flex items-center gap-1.5'>
            <span className='font-mono text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground'>
              ESC
            </span>
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              title='Close drawer'
              className='size-8'
            >
              <X className='size-4' />
            </Button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6 bg-background'>
          {isDeleted && (
            <div className='p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-2.5'>
              <Trash2 className='size-4 shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold'>Tài khoản này đã bị xóa mềm (DELETED)</p>
                <p className='text-[11px] opacity-90 mt-0.5'>
                  Tài khoản không thể đăng nhập hay thay đổi vai trò. Bạn có thể bấm nút <strong>Khôi phục tài khoản</strong> bên dưới để kích hoạt lại.
                </p>
              </div>
            </div>
          )}

          {isInactive && (
            <div className='p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5'>
              <Clock className='size-4 text-amber-600 shrink-0 mt-0.5' />
              <div>
                <p className='font-semibold'>Tài khoản đang ở trạng thái tạm ngưng (INACTIVE)</p>
                <p className='text-[11px] opacity-90 mt-0.5'>
                  Tài khoản chưa xác thực email hoặc đã lâu không đăng nhập. Người dùng cần <strong>xác thực lại email</strong> để đăng nhập lại (hoặc Quản trị viên có thể kích hoạt thủ công).
                </p>
              </div>
            </div>
          )}

          {/* Meta Summary Chips */}
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex items-center gap-1.5'>
              <Badge variant='outline' className='flex items-center gap-1 text-xs py-1 px-2.5 font-medium'>
                <User className='size-3.5 text-muted-foreground' />
                <span>Role: {user.role}</span>
              </Badge>
              {!isDeleted && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setRoleModalOpen(true)}
                  className='h-6 text-[10px] px-2 gap-1 font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-2xs'
                  title='Gán hoặc thay đổi vai trò người dùng'
                >
                  <UserCog className='size-3' />
                  <span>Đổi vai trò</span>
                </Button>
              )}
            </div>

            <Badge variant='outline' className='flex items-center gap-1 text-xs py-1 px-2.5 font-medium bg-indigo-50/60 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'>
              <BadgeCheck className='size-3.5' />
              <span>Enterprise Workspace Member</span>
            </Badge>

            <Badge variant='outline' className='flex items-center gap-1 text-xs py-1 px-2.5 font-medium bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'>
              <Shield className='size-3.5' />
              <span>MFA: {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
            </Badge>
          </div>

          {/* SECTION 1: Account & Contact Information */}
          <div className='rounded-xl border border-border p-4 bg-card shadow-2xs'>
            <div className='flex items-center justify-between mb-3 pb-2 border-b border-border'>
              <h3 className='text-sm font-semibold text-foreground flex items-center gap-1.5'>
                <User className='size-4 text-primary' />
                <span>Account &amp; Contact Information</span>
              </h3>
              <Badge variant='outline' className='text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200'>
                {user.kycStatus}
              </Badge>
            </div>

            <div className='grid grid-cols-2 gap-4 text-xs'>
              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Full Legal Name
                </span>
                <p className='font-medium text-foreground'>{user.legalName}</p>
              </div>

              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Primary Email
                </span>
                <p className='font-mono text-foreground flex items-center gap-1 truncate'>
                  <span>{user.email}</span>
                  <CheckCircle2 className='size-3 text-emerald-600 shrink-0' />
                </p>
              </div>

              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Phone Number
                </span>
                <p className='font-medium text-foreground'>{user.phone}</p>
              </div>

              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Company / Org
                </span>
                <p className='font-medium text-foreground truncate'>{displayCompany}</p>
              </div>

              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Registration IP
                </span>
                <p className='font-mono text-foreground text-[11px]'>{user.registrationIp}</p>
              </div>

              <div>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Locale / Timezone
                </span>
                <p className='font-medium text-foreground'>{user.timezone}</p>
              </div>

              <div className='col-span-2 pt-2 border-t border-border/50'>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5'>
                  Ngày đăng ký tài khoản
                </span>
                <p className='font-medium text-foreground flex items-center gap-1.5'>
                  <Calendar className='size-3.5 text-primary' />
                  <span>{displayDate} {displayTime ? `(${displayTime})` : ''}</span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Security & Authentication */}
          <div className='rounded-xl border border-border p-4 bg-card shadow-2xs'>
            <div className='flex items-center justify-between mb-3 pb-2 border-b border-border'>
              <h3 className='text-sm font-semibold text-foreground flex items-center gap-1.5'>
                <Shield className='size-4 text-primary' />
                <span>Security &amp; Authentication</span>
              </h3>
              <span className='font-mono text-[11px] text-muted-foreground'>SecOps Tier A</span>
            </div>

            <div className='space-y-2.5 text-xs'>
              <div className='flex items-center justify-between py-1 border-b border-border/50'>
                <span className='text-muted-foreground'>Two-Factor Auth (2FA)</span>
                <span className='font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1'>
                  <span className='size-1.5 rounded-full bg-emerald-500' />
                  {user.twoFactorMethod}
                </span>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-border/50'>
                <span className='text-muted-foreground'>Last Login Timestamp</span>
                <span className='font-mono text-foreground text-[11px]'>{user.lastLogin}</span>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-border/50'>
                <span className='text-muted-foreground'>Client Fingerprint</span>
                <span className='font-medium text-foreground'>{user.clientFingerprint}</span>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-border/50'>
                <span className='text-muted-foreground'>Consecutive Failed Logins</span>
                <span className='font-mono px-1.5 py-0.5 bg-muted rounded text-[11px] text-foreground'>
                  {user.consecutiveFailedLogins} (Normal risk profile)
                </span>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-border/50'>
                <span className='text-muted-foreground'>Session Root Key</span>
                <span className='font-mono text-muted-foreground text-[11px] truncate max-w-[200px]'>
                  {user.sessionRootKey}
                </span>
              </div>

              <div className='flex items-center justify-between py-1'>
                <span className='text-muted-foreground'>Password Last Changed</span>
                <span className='font-medium text-foreground'>{user.passwordLastChanged}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Platform Activity & Usage Summary */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold text-foreground flex items-center gap-1.5'>
                <Activity className='size-4 text-primary' />
                <span>Platform Activity &amp; Usage</span>
              </h3>
              <span className='text-xs text-muted-foreground'>Lifetime Aggregates</span>
            </div>

            {/* 3 Mini KPI cards */}
            <div className='grid grid-cols-3 gap-3 mb-4'>
              <div className='bg-card border border-border p-3 rounded-lg text-center shadow-2xs'>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase'>
                  Total Bookings
                </span>
                <span className='text-xl font-bold text-foreground mt-0.5 block'>
                  {user.stats.totalBookings}
                </span>
                <span className='text-[10px] text-muted-foreground font-mono'>
                  {user.stats.gmvAmount}
                </span>
              </div>

              <div className='bg-card border border-border p-3 rounded-lg text-center shadow-2xs'>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase'>
                  Active Escrows
                </span>
                <span className='text-xl font-bold text-primary mt-0.5 block'>
                  {user.stats.activeEscrows}
                </span>
                <span className='text-[10px] text-muted-foreground font-mono'>
                  {user.stats.escrowHoldAmount}
                </span>
              </div>

              <div className='bg-card border border-border p-3 rounded-lg text-center shadow-2xs'>
                <span className='block text-muted-foreground text-[10px] font-semibold uppercase'>
                  Disputes
                </span>
                <span className='text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block'>
                  {user.stats.disputesCount}
                </span>
                <span className='text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold'>
                  Clean record
                </span>
              </div>
            </div>

            {/* Recent activity feed */}
            <div className='border border-border rounded-lg bg-card p-3 space-y-2.5 shadow-2xs'>
              <span className='text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block'>
                Recent Activity Log
              </span>
              {user.activityLogs.map((log) => (
                <div key={log.id} className='flex items-start gap-2.5 text-xs'>
                  <span className='size-2 rounded-full bg-primary mt-1.5 shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-foreground leading-snug'>{log.title}</p>
                    <span className='text-[11px] text-muted-foreground font-mono block mt-0.5'>
                      {log.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: Administrative Account Controls */}
          <div className='border-t border-border pt-5 space-y-3.5 bg-muted/30 -mx-6 px-6 pb-4'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='size-4 text-amber-600' />
              <h4 className='text-xs font-semibold text-foreground uppercase tracking-wider'>
                Administrative Account Controls
              </h4>
            </div>

            <p className='text-xs text-muted-foreground leading-relaxed'>
              Critical operations affect account credentials, active marketplace contracts, and escrow authorizations across the platform.
            </p>

            <div className='grid grid-cols-2 gap-2 pt-1'>
              {/* Primary Lifecycle Button: Restore / Activate / Unlock / Lock */}
              <Button
                variant={isLocked || isInactive || isDeleted ? 'default' : 'outline'}
                size='sm'
                disabled={isUpdatingStatus || drawerStatusMutation.isPending}
                onClick={() =>
                  isLocked || isInactive || isDeleted
                    ? setUnlockModalOpen(true)
                    : setLockModalOpen(true)
                }
                className={`text-xs font-semibold h-9 gap-1.5 ${
                  isLocked || isInactive || isDeleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                {isLocked || isInactive || isDeleted ? (
                  <Unlock className='size-3.5' />
                ) : (
                  <Lock className='size-3.5' />
                )}
                <span>
                  {isUpdatingStatus || drawerStatusMutation.isPending
                    ? 'Đang cập nhật...'
                    : isDeleted
                    ? 'Khôi phục tài khoản'
                    : isInactive
                    ? 'Kích hoạt tài khoản'
                    : isLocked
                    ? 'Mở khóa tài khoản'
                    : 'Khóa tài khoản'}
                </span>
              </Button>

              {/* Change Role Button */}
              <Button
                variant='outline'
                size='sm'
                disabled={isDeleted}
                onClick={() => setRoleModalOpen(true)}
                title={isDeleted ? 'Không thể đổi vai trò tài khoản đã xóa' : 'Gán hoặc thay đổi vai trò'}
                className='text-xs font-semibold h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50'
              >
                <UserCog className='size-3.5' />
                <span>Gán / Đổi vai trò</span>
              </Button>
            </div>

            {!isDeleted && (
              <div className='grid grid-cols-2 gap-2'>
                {isActive ? (
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={drawerStatusMutation.isPending}
                    onClick={() =>
                      drawerStatusMutation.mutate({
                        userId: user.id,
                        nextStatus: 'INACTIVE',
                        userName: displayName,
                        reason: 'Quản trị viên tạm ngưng tài khoản (yêu cầu xác thực lại email)'
                      })
                    }
                    className='text-xs font-semibold h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30'
                  >
                    <Clock className='size-3.5' />
                    <span>Chuyển INACTIVE</span>
                  </Button>
                ) : (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setResetModalOpen(true)}
                    className='text-xs font-semibold h-8 gap-1.5'
                  >
                    <RotateCcw className='size-3.5' />
                    <span>Force Reset</span>
                  </Button>
                )}

                {/* Soft Delete Account */}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setDeleteModalOpen(true)}
                  className='text-xs text-red-700 hover:text-red-800 hover:bg-red-50/70 dark:text-red-400 dark:hover:bg-red-950/30 font-semibold h-8 gap-1.5 border border-transparent hover:border-red-200 dark:hover:border-red-900'
                >
                  <Trash2 className='size-3.5' />
                  <span>Xóa mềm (DELETED)</span>
                </Button>
              </div>
            )}

            <div className='pt-2 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-muted-foreground'>
              <Shield className='size-3 text-muted-foreground' />
              <span>Mọi hành động quản trị đều được ghi vết tự động vào nhật ký kiểm toán bất biến (Audit Log).</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Lock User Modal (Yêu cầu lý do bắt buộc + chọn thời hạn) */}
      <LockUserDialog
        user={user}
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
      />

      {/* Unlock User Modal (Lý do không bắt buộc) */}
      <UnlockUserDialog
        user={user}
        open={unlockModalOpen}
        onOpenChange={setUnlockModalOpen}
      />

      {/* Change User Role Modal (Yêu cầu lý do bắt buộc) */}
      <ChangeRoleDialog
        user={user}
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
      />

      {/* Soft Delete User Modal (Yêu cầu lý do bắt buộc) */}
      <DeleteUserDialog
        user={user}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
      />

      {/* Force Reset Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Confirm Password Reset</DialogTitle>
            <DialogDescription>
              Are you sure you want to invalidate all existing sessions and force a password reset for{' '}
              <strong className='text-foreground'>{user.name}</strong> ({user.email})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset}>Dispatch Reset Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
