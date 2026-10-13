import React from 'react';
import { DollarSign, Percent, Landmark, Receipt, TrendingUp } from 'lucide-react';
import { FinancialSummaryKpis } from '../data/mock-transactions';

interface FinancialKpiGridProps {
  kpis: FinancialSummaryKpis;
}

export function FinancialKpiGrid({ kpis }: FinancialKpiGridProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {/* KPI 1: Gross Payment Volume */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Gross Payment Volume</span>
          <div className='p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'>
            <DollarSign className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex flex-col items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            ${kpis.grossVolumeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className='text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5'>
            <TrendingUp className='size-3.5' aria-hidden='true' /> +{kpis.momGrowth}%
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          ≈ {kpis.grossVolumeVnd.toLocaleString()} VND • Last 30 Days
        </div>
      </div>

      {/* KPI 2: Platform Net Commission */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Platform Net Commission</span>
          <div className='p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'>
            <Percent className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex flex-col items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            ${kpis.netCommissionUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className='text-xs px-1.5 py-0.2 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'>
            Avg {kpis.avgTakeRate}% Take Rate
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          ≈ {kpis.netCommissionVnd.toLocaleString()} VND • Net Retained Revenue
        </div>
      </div>

      {/* KPI 3: Organizer Escrow Payouts */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Organizer Escrow Payouts</span>
          <div className='p-2 rounded-lg bg-primary/10 text-primary'>
            <Landmark className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            ${kpis.payoutsUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          ≈ {kpis.payoutsVnd.toLocaleString()} VND • Disbursed 98.4% on time
        </div>
      </div>

      {/* KPI 4: Gateway Fees & Tax */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Gateway Fees &amp; Tax Withheld</span>
          <div className='p-2 rounded-lg bg-muted text-muted-foreground'>
            <Receipt className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            ${kpis.gatewayFeesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className='text-xs text-muted-foreground'>
          PayOS / VietQR Napas247 &amp; Local VAT Deductions
        </div>
      </div>
    </div>
  );
}
