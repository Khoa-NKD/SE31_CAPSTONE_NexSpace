import React from 'react';
import { TrendingUp, BarChart3 } from '@/components/ui/hugeicons';
import { MOCK_GTV_MONTHLY_HISTORY } from '../data/mock-commissions';
import { useLanguage } from '@/features/landing/context/language-context';

export function GtvRevenueChart() {
  const { language } = useLanguage();

  return (
    <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full'>
      <div>
        {/* Header with Title & MoM Badge */}
        <div className='flex items-start justify-between gap-3 mb-4'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='p-1 rounded-md bg-primary/10 text-primary'>
                <BarChart3 className='size-4' />
              </div>
              <h2 className='text-sm sm:text-base font-semibold text-foreground tracking-tight'>
                {language === 'vi'
                  ? 'Tổng giá trị giao dịch (GTV) & Doanh thu sàn thực tế'
                  : 'Gross Transaction Volume vs Net Platform Revenue'}
              </h2>
            </div>
            <p className='text-xs text-muted-foreground mt-1 ml-7'>
              {language === 'vi'
                ? 'So sánh lũy kế 6 tháng qua (Thg 8/2025 – Thg 1/2026)'
                : 'Historical comparison over the rolling 6 months (Aug 2025 – Jan 2026)'}
            </p>
          </div>
          <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shrink-0'>
            <TrendingUp className='size-3.5 text-emerald-600 dark:text-emerald-400' />
            +12.4% MoM
          </span>
        </div>

        {/* Legend */}
        <div className='flex items-center gap-5 mb-5 text-xs font-medium flex-wrap ml-7'>
          <div className='flex items-center gap-2'>
            <span className='size-2.5 rounded-full bg-primary' />
            <span className='text-muted-foreground'>
              {language === 'vi' ? 'Tổng khối lượng giao dịch (GTV)' : 'Gross Volume (GTV)'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='size-2.5 rounded-full bg-emerald-500' />
            <span className='text-muted-foreground'>
              {language === 'vi' ? 'Doanh thu hoa hồng sàn (TB 12.0%)' : 'Net Platform Revenue (Avg 12.0%)'}
            </span>
          </div>
        </div>

        {/* Dual Bar Canvas */}
        <div className='space-y-3.5 pt-1'>
          {MOCK_GTV_MONTHLY_HISTORY.map((item) => (
            <div
              key={item.month}
              className='p-2 rounded-lg hover:bg-muted/40 transition-colors group'
            >
              <div className='flex items-center justify-between text-xs gap-3'>
                <span className='w-20 font-semibold text-foreground font-mono text-[11px] shrink-0'>
                  {language === 'vi' ? item.monthVi : item.month}
                </span>

                <div className='flex-1 mx-2 space-y-1.5 min-w-0'>
                  {/* GTV Bar */}
                  <div
                    className='w-full bg-muted/60 h-2.5 rounded-full overflow-hidden flex'
                    role='progressbar'
                    aria-label={`${item.month} Gross Transaction Volume`}
                    aria-valuenow={item.gtvPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className='bg-primary h-full rounded-full transition-all duration-500 group-hover:brightness-110'
                      style={{ width: `${item.gtvPercent}%` }}
                    />
                  </div>
                  {/* Revenue Bar */}
                  <div
                    className='w-full bg-muted/60 h-2 rounded-full overflow-hidden flex'
                    role='progressbar'
                    aria-label={`${item.month} Net Platform Revenue`}
                    aria-valuenow={item.revenuePercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className='bg-emerald-500 h-full rounded-full transition-all duration-500 group-hover:brightness-110'
                      style={{ width: `${item.revenuePercent}%` }}
                    />
                  </div>
                </div>

                <div className='text-right font-mono text-[11px] whitespace-nowrap min-w-[140px] shrink-0'>
                  <span className='font-bold text-foreground'>
                    {language === 'vi' ? item.gtvDisplayVnd : item.gtvDisplay}
                  </span>
                  <span className='text-muted-foreground'>
                    {' '}
                    / {language === 'vi' ? item.netDisplayVnd : item.netDisplay}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Meta */}
      <div className='mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-muted-foreground text-xs'>
        <span className='text-[11px]'>
          {language === 'vi'
            ? 'Quyết toán đối soát trực tiếp qua PayOS & ngân hàng nội địa.'
            : 'Settled in VND & domestic banking via PayOS Gateway.'}
        </span>
        <span className='font-mono text-[10px] font-semibold text-muted-foreground/80'>
          Node: SG1-LEDGER-MAIN
        </span>
      </div>
    </div>
  );
}
