import React from 'react';
import { Wallet, Percent, Landmark, Receipt, TrendingUp } from '@/components/ui/hugeicons';
import { FinancialSummaryKpis } from '../data/mock-transactions';

interface FinancialKpiGridProps {
  kpis: FinancialSummaryKpis;
  language?: 'vi' | 'en';
}

function formatVndAmount(value: number): string {
  return Math.round(value).toLocaleString('vi-VN') + ' đ';
}

export function FinancialKpiGrid({ kpis, language = 'vi' }: FinancialKpiGridProps) {
  const isVi = language === 'vi';
  const gatewayFeeVnd = Math.round(kpis.grossVolumeVnd * 0.015);

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5'>
      {/* KPI 1: Gross Payment Volume */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Tổng giá trị GD (Gross)' : 'Gross Volume'}
          </span>
          <div className='p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform'>
            <Wallet className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {formatVndAmount(kpis.grossVolumeVnd)}
          </div>
          <div className='flex flex-wrap items-center gap-1.5 text-[11px]'>
            <span className='inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400'>
              <TrendingUp className='size-3' aria-hidden='true' /> +{kpis.momGrowth}%
            </span>
            <span className='text-muted-foreground truncate'>
              {isVi ? 'qua PayOS' : 'via PayOS'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI 2: Platform Net Commission */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-indigo-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Doanh thu phí sàn' : 'Platform Net Fee'}
          </span>
          <div className='p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform'>
            <Percent className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {formatVndAmount(kpis.netCommissionVnd)}
          </div>
          <div className='flex items-center gap-1.5 text-[11px]'>
            <span className='inline-flex items-center px-1.5 py-0.2 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px]'>
              {kpis.avgTakeRate}% Take Rate
            </span>
            <span className='text-muted-foreground truncate'>
              {isVi ? 'thu nhập sàn' : 'net margin'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI 3: Organizer Escrow Payouts */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Ký quỹ & Giải ngân' : 'Partner Payouts'}
          </span>
          <div className='p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform'>
            <Landmark className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {formatVndAmount(kpis.payoutsVnd)}
          </div>
          <div className='flex items-center gap-1 text-[11px] text-muted-foreground truncate'>
            <span>{isVi ? 'Dòng tiền đối tác (Napas247)' : 'Escrow flow (Napas247)'}</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Gateway Fees & Tax */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-muted-foreground/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
            {isVi ? 'Phí cổng & Thuế' : 'Gateway Fee & Tax'}
          </span>
          <div className='p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:scale-105 transition-transform'>
            <Receipt className='size-3.5 sm:size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-foreground whitespace-nowrap tabular-nums'>
            {formatVndAmount(gatewayFeeVnd)}
          </div>
          <div className='flex items-center gap-1 text-[11px] text-muted-foreground truncate'>
            <span>{isVi ? 'Ước tính 1,5% phí PayOS' : 'Est. 1.5% PayOS fee'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
