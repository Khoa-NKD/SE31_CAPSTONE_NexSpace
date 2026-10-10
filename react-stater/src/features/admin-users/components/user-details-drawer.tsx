import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  UserMinus,
  CheckCircle2,
  Shield,
  BadgeCheck,
  User,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminUserRecord } from '../data/mock-users';

interface UserDetailsDrawerProps {
  user: AdminUserRecord | null;
  onClose: () => void;
  onToggleStatus: (userId: string) => void;
}

export function UserDetailsDrawer({ user, onClose, onToggleStatus }: UserDetailsDrawerProps) {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (user) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, onClose]);

  if (!user) return null;

  const isLocked = user.status === 'Locked';
  const isActive = user.status === 'Active';

  const handlePasswordReset = () => {
    setResetModalOpen(false);
    toast.success(`Password Reset Link Dispatched (Simulated)`, {
      description: `Dispatched cryptographically sealed one-time login link to ${user.email}.`
    });
  };

  const handleDeactivate = () => {
    setDeactivateModalOpen(false);
    toast.error(`Account Deactivated (Simulated)`, {
      description: `Account ${user.id} permanently flagged for decommission in SOC2 queue.`
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
            <div className='w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 shadow-2xs relative shrink-0'>
              <img
                src={user.avatarUrl}
                alt={user.name}
                className='w-full h-full object-cover'
              />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-lg font-bold font-heading text-foreground'>
                  {user.name}
                </h2>
                <Badge
                  variant='outline'
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : isLocked
                      ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full mr-1 ${
                      isActive
                        ? 'bg-emerald-500'
                        : isLocked
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {user.status}
                </Badge>
              </div>
              <p className='text-xs font-mono text-muted-foreground mt-0.5'>
                {user.id} • Joined {user.registeredDate}
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
          {/* Meta Summary Chips */}
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='flex items-center gap-1 text-xs py-1 px-2.5 font-medium'>
              <User className='size-3.5 text-muted-foreground' />
              <span>Role: {user.role}</span>
            </Badge>

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
                <p className='font-medium text-foreground truncate'>{user.company}</p>
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
              {/* Lock / Unlock Toggle Button */}
              <Button
                variant={isLocked ? 'default' : 'outline'}
                size='sm'
                onClick={() => onToggleStatus(user.id)}
                className={`text-xs font-semibold h-9 gap-1.5 ${
                  isLocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                {isLocked ? <Unlock className='size-3.5' /> : <Lock className='size-3.5' />}
                <span>{isLocked ? 'Unlock Account' : 'Lock Account'}</span>
              </Button>

              {/* Force Password Reset */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setResetModalOpen(true)}
                className='text-xs font-semibold h-9 gap-1.5'
              >
                <RotateCcw className='size-3.5' />
                <span>Force Reset</span>
              </Button>
            </div>

            {/* Deactivate Account */}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeactivateModalOpen(true)}
              className='w-full text-xs text-muted-foreground hover:text-red-700 hover:bg-red-50/50 dark:hover:bg-red-950/30 font-medium'
            >
              <UserMinus className='size-3.5 mr-1.5' />
              <span>Deactivate Account Permanently</span>
            </Button>

            <div className='pt-2 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-muted-foreground'>
              <Shield className='size-3 text-muted-foreground' />
              <span>All moderation actions are cryptographically logged to SOC-2 immutable audit trail.</span>
            </div>
          </div>
        </div>
      </aside>

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

      {/* Deactivate Account Modal */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-red-600'>Deactivate User Account</DialogTitle>
            <DialogDescription>
              This simulated action will suspend all active bookings and escrow releases associated with{' '}
              <strong className='text-foreground'>{user.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeactivateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDeactivate}>
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
