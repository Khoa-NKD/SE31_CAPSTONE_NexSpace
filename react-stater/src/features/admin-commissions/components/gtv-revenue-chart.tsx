import React from 'react';
import { TrendingUp } from 'lucide-react';
import { MOCK_GTV_MONTHLY_HISTORY } from '../data/mock-commissions';

export function GtvRevenueChart() {
  return (
    <div className='bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm flex flex-col justify-between h-full'>
      <div>
        {/* Header with Title & MoM Badge */}
        <div className='flex items-start justify-between mb-4'>
          <div>
            <h2 className='text-base font-semibold text-foreground tracking-tight'>
              Gross Transaction Volume vs Net Platform Revenue
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Historical comparison over the rolling 6 months (Aug 2025 – Jan 2026)
            </p>
          </div>
          <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold'>
            <TrendingUp className='size-3.5 text-emerald-600 dark:text-emerald-400' />
            +12.4% MoM
          </span>
        </div>

        {/* Legend */}
        <div className='flex items-center gap-6 mb-6 text-xs font-medium'>
          <div className='flex items-center gap-2'>
            <span className='size-3 rounded bg-primary' />
            <span className='text-muted-foreground'>Gross Volume (GTV)</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='size-3 rounded bg-emerald-500' />
            <span className='text-muted-foreground'>Net Platform Revenue (Avg 12.0%)</span>
          </div>
        </div>

        {/* Dual Bar Canvas */}
        <div className='space-y-4 pt-1'>
          {MOCK_GTV_MONTHLY_HISTORY.map((item) => (
            <div key={item.month} className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs'>
                <span className='w-16 font-semibold text-foreground'>
                  {item.month}
                </span>

                <div className='flex-1 mx-4 space-y-1'>
                  {/* GTV Bar */}
                  <div
                    className='w-full bg-muted h-3 rounded-full overflow-hidden flex'
                    role='progressbar'
                    aria-label={`${item.month} Gross Transaction Volume`}
                    aria-valuenow={item.gtvPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className='bg-primary h-full rounded-full transition-all duration-500'
                      style={{ width: `${item.gtvPercent}%` }}
                    />
                  </div>
                  {/* Revenue Bar */}
                  <div
                    className='w-full bg-muted h-2 rounded-full overflow-hidden flex'
                    role='progressbar'
                    aria-label={`${item.month} Net Platform Revenue`}
                    aria-valuenow={item.revenuePercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className='bg-emerald-500 h-full rounded-full transition-all duration-500'
                      style={{ width: `${item.revenuePercent}%` }}
                    />
                  </div>
                </div>

                <div className='text-right font-mono text-[11px] whitespace-nowrap min-w-[120px]'>
                  <span className='font-bold text-foreground'>
                    {item.gtvDisplay}
                  </span>
                  <span className='text-muted-foreground'> / {item.netDisplay}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Meta */}
      <div className='mt-6 pt-4 border-t border-border flex items-center justify-between text-muted-foreground text-xs'>
        <span>Settled in VND &amp; USD according to SBV FX fixings.</span>
        <span className='font-mono text-[11px] font-semibold text-foreground'>
          Node: SG1-LEDGER-MAIN
        </span>
      </div>
    </div>
  );
}
