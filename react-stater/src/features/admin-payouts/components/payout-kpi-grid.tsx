import React from 'react';
import { Landmark, CheckCircle2, Clock, AlertTriangle } from '@/components/ui/hugeicons';

export interface PayoutKpiStats {
  totalDisbursedVnd: number;
  paidCount: number;
  pendingRequestsCount: number;
  failedCount: number;
}

interface PayoutKpiGridProps {
  stats: PayoutKpiStats;
  language?: 'vi' | 'en';
}

function formatVnd(value: number): string {
  return Math.round(value).toLocaleString('vi-VN') + ' đ';
}

export function PayoutKpiGrid({ stats, language = 'vi' }: PayoutKpiGridProps) {
  const isVi = language === 'vi';

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5'>
      {/* KPI 1: Total Disbursed Volume */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Tổng tiền đã giải ngân' : 'Total Disbursed'}
          </span>
          <div className='p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform'>
            <Landmark className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {formatVnd(stats.totalDisbursedVnd)}
          </div>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground truncate'>
            <span>{isVi ? 'Đã chi trả qua PayOS' : 'Disbursed via PayOS'}</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Successful Payouts */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Lệnh chi thành công' : 'Paid Batches'}
          </span>
          <div className='p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform'>
            <CheckCircle2 className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {stats.paidCount} <span className='text-xs font-medium text-muted-foreground'>{isVi ? 'đợt chi' : 'batches'}</span>
          </div>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground truncate'>
            <span>{isVi ? '100% tài khoản khớp' : '100% matched bank accounts'}</span>
          </div>
        </div>
      </div>

      {/* KPI 3: Pending Auto Payout Requests */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-amber-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Yêu cầu chờ duyệt' : 'Pending Requests'}
          </span>
          <div className='p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform'>
            <Clock className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {stats.pendingRequestsCount} <span className='text-xs font-medium text-muted-foreground'>{isVi ? 'yêu cầu' : 'requests'}</span>
          </div>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground truncate'>
            <span>{isVi ? 'Cấu hình Auto Daily' : 'Auto payout settings'}</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Failed Payouts / Action Required */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-rose-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Cần xử lý / Thất bại' : 'Action Required'}
          </span>
          <div className='p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform'>
            <AlertTriangle className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {stats.failedCount} <span className='text-xs font-medium text-muted-foreground'>{isVi ? 'lệnh lỗi' : 'failed'}</span>
          </div>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground truncate'>
            <span className={stats.failedCount > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
              {stats.failedCount > 0
                ? isVi ? 'Cần bấm Thử lại (Retry)' : 'Retry required'
                : isVi ? 'Không có lỗi cổng PayOS' : 'No gateway errors'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
