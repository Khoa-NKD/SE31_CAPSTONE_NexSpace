import React from 'react';
import { Wallet, Percent, Landmark, Receipt, TrendingUp } from 'lucide-react';
import { FinancialSummaryKpis } from '../data/mock-transactions';

interface FinancialKpiGridProps {
  kpis: FinancialSummaryKpis;
}

export function FinancialKpiGrid({ kpis }: FinancialKpiGridProps) {
  const gatewayFeeVnd = Math.round(kpis.grossVolumeVnd * 0.015);

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {/* KPI 1: Gross Payment Volume */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Tổng giá trị giao dịch (Gross Volume)</span>
          <div className='p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'>
            <Wallet className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex flex-col items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground font-mono'>
            {kpis.grossVolumeVnd.toLocaleString('vi-VN')} ₫
          </span>
          <span className='text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5'>
            <TrendingUp className='size-3.5' aria-hidden='true' /> +{kpis.momGrowth}% tăng trưởng
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Toàn bộ thanh toán qua cổng PayOS
        </div>
      </div>

      {/* KPI 2: Platform Net Commission */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Doanh thu phí sàn (Platform Fee)</span>
          <div className='p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'>
            <Percent className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex flex-col items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground font-mono'>
            {kpis.netCommissionVnd.toLocaleString('vi-VN')} ₫
          </span>
          <span className='text-xs px-1.5 py-0.2 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'>
            Tỷ lệ phí {kpis.avgTakeRate}% Take Rate
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Doanh thu thuần NexSpace giữ lại
        </div>
      </div>

      {/* KPI 3: Organizer Escrow Payouts */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Ký quỹ &amp; Giải ngân đối tác (Payouts)</span>
          <div className='p-2 rounded-lg bg-primary/10 text-primary'>
            <Landmark className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground font-mono'>
            {kpis.payoutsVnd.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Dòng tiền chi trả đối tác (Napas247)
        </div>
      </div>

      {/* KPI 4: Gateway Fees & Tax */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Phí cổng PayOS &amp; Thuế khấu trừ</span>
          <div className='p-2 rounded-lg bg-muted text-muted-foreground'>
            <Receipt className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground font-mono'>
            {gatewayFeeVnd.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Ước tính 1,5% phí trung gian cổng thanh toán
        </div>
      </div>
    </div>
  );
}
