import React from 'react';
import { RefundSummaryKpis, formatVnd } from '../data/mock-refunds';

interface RefundsKpiGridProps {
  kpis: RefundSummaryKpis;
  language?: 'vi' | 'en';
}

export function RefundsKpiGrid({ kpis, language = 'vi' }: RefundsKpiGridProps) {
  const isVi = language === 'vi';

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5'>
      {/* Card 1: Pending Review */}
      <div className='relative overflow-hidden rounded-xl border bg-card p-4.5 shadow-2xs transition-all hover:border-amber-500/40'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            {isVi ? 'Yêu cầu chờ xét duyệt' : 'In Triage Worklist'}
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400'>
            <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
            {isVi ? 'Cần xử lý' : 'Action Required'}
          </span>
        </div>
        <div className='mt-2.5 flex items-baseline gap-2'>
          <div className='text-2xl font-bold tracking-tight text-foreground'>
            {kpis.pendingCount} <span className='text-sm font-medium text-muted-foreground'>{isVi ? 'yêu cầu' : 'Requests'}</span>
          </div>
        </div>
        <div className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='font-semibold text-amber-600 dark:text-amber-400'>
            {formatVnd(kpis.pendingVolumeVnd)}
          </span>
          <span>{isVi ? 'tổng tiền hoàn đang chờ duyệt' : 'pending adjudication'}</span>
        </div>
      </div>

      {/* Card 2: Approved & Processed */}
      <div className='relative overflow-hidden rounded-xl border bg-card p-4.5 shadow-2xs transition-all hover:border-emerald-500/40'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            {isVi ? 'Đã chi trả hoàn tiền' : 'Disbursed Volume'}
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400'>
            <span className='size-1.5 rounded-full bg-emerald-500' />
            {isVi ? 'Đã chi qua PayOS' : 'Processed (PayOS)'}
          </span>
        </div>
        <div className='mt-2.5 flex items-baseline gap-2'>
          <div className='text-2xl font-bold tracking-tight text-foreground'>
            {kpis.processedCount} <span className='text-sm font-medium text-muted-foreground'>{isVi ? 'lượt hoàn' : 'Refunds'}</span>
          </div>
        </div>
        <div className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
            {formatVnd(kpis.processedVolumeVnd)}
          </span>
          <span>{isVi ? 'đã giải ngân qua cổng PayOS' : 'disbursed via PayOS'}</span>
        </div>
      </div>

      {/* Card 3: Rejected Claims */}
      <div className='relative overflow-hidden rounded-xl border bg-card p-4.5 shadow-2xs transition-all hover:border-rose-500/40'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            {isVi ? 'Khiếu nại bị từ chối' : 'Dispute Exceptions'}
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400'>
            <span className='size-1.5 rounded-full bg-rose-500' />
            {isVi ? 'Từ chối' : 'Denied'}
          </span>
        </div>
        <div className='mt-2.5 flex items-baseline gap-2'>
          <div className='text-2xl font-bold tracking-tight text-foreground'>
            {kpis.rejectedCount} <span className='text-sm font-medium text-muted-foreground'>{isVi ? 'khiếu nại' : 'Claims'}</span>
          </div>
        </div>
        <div className='mt-1 text-xs text-muted-foreground'>
          <span>{isVi ? 'Vi phạm chính sách hủy hoặc sai lệch minh chứng' : 'Policy breach or invalid evidence'}</span>
        </div>
      </div>
    </div>
  );
}
