import React from 'react';
import { RefundSummaryKpis } from '../data/mock-refunds';

interface RefundsKpiGridProps {
  kpis: RefundSummaryKpis;
}

export function RefundsKpiGrid({ kpis }: RefundsKpiGridProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-5 mb-6'>
      {/* Card 1: Pending Review */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all relative overflow-hidden'>
        <div className='absolute top-0 left-0 h-1 w-full bg-amber-500' />
        <div className='flex items-start justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            In Triage Worklist
          </span>
          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'>
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
            Action Required
          </span>
        </div>
        <div className='mt-3 flex items-baseline gap-2'>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.pendingCount} Requests
          </div>
        </div>
        <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground font-medium'>
          <span className='text-amber-600 dark:text-amber-400 font-semibold'>
            ${kpis.pendingVolumeUsd.toFixed(2)}
          </span>
          <span>total refundable volume pending adjudication</span>
        </div>
      </div>

      {/* Card 2: Approved & Processed */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all relative overflow-hidden'>
        <div className='absolute top-0 left-0 h-1 w-full bg-emerald-500' />
        <div className='flex items-start justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Disbursed Volume
          </span>
          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
            Processed (30d)
          </span>
        </div>
        <div className='mt-3 flex items-baseline gap-2'>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.processedCount} Refunds
          </div>
        </div>
        <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground font-medium'>
          <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>
            ${kpis.processedVolumeUsd.toFixed(2)}
          </span>
          <span>disbursed via PayOS Escrow</span>
        </div>
      </div>

      {/* Card 3: Rejected Claims */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all relative overflow-hidden'>
        <div className='absolute top-0 left-0 h-1 w-full bg-red-500' />
        <div className='flex items-start justify-between'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Dispute Exceptions
          </span>
          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'>
            <span className='w-1.5 h-1.5 rounded-full bg-red-500' />
            Denied
          </span>
        </div>
        <div className='mt-3 flex items-baseline gap-2'>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.rejectedCount} Claims
          </div>
        </div>
        <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground font-medium'>
          <span>Policy breach or invalid evidence verification</span>
        </div>
      </div>
    </div>
  );
}
