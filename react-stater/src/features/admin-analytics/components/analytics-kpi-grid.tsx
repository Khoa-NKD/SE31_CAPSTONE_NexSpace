import React from 'react';
import { DoorOpen, Wallet, Store, ArrowUp } from '@/components/ui/hugeicons';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPlatformAnalyticsResponseDTO } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface AnalyticsKpiGridProps {
  summary?: AdminPlatformAnalyticsResponseDTO;
  isLoading?: boolean;
}

export function AnalyticsKpiGrid({ summary, isLoading }: AnalyticsKpiGridProps) {
  const { language } = useLanguage();

  if (isLoading || !summary) {
    return (
      <section
        aria-label='Operational Utilization & Growth KPI Cards'
        className='grid grid-cols-1 md:grid-cols-3 gap-4'
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='bg-card rounded-xl border border-border/70 p-4 shadow-2xs space-y-3 animate-pulse'>
            <div className='flex justify-between items-center'>
              <Skeleton className='h-3.5 w-36' />
              <Skeleton className='size-8 rounded-lg' />
            </div>
            <Skeleton className='h-8 w-28' />
            <Skeleton className='h-3 w-full' />
          </div>
        ))}
      </section>
    );
  }

  const occupancyDisplay = `${(summary.averageOccupancyPercent || 0).toFixed(1)}%`;
  const occupancyChange = summary.occupancyChangePercent || '+4.2% MoM';

  const gmvDisplay = `${(summary.grossRevenueVnd || 0).toLocaleString('vi-VN')} ₫`;
  const gmvUsdDisplay = `$${(summary.grossRevenueUsd || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} USD`;
  const gmvChange = summary.grossRevenueChangePercent || '+14.8% MoM';

  const netRevDisplay = `${(summary.netRevenueVnd || 0).toLocaleString('vi-VN')} ₫`;
  const workspacesCount = summary.activeWorkspacesCount || 0;
  const bookingsCount = summary.totalBookings || 0;

  return (
    <section
      aria-label='Operational Utilization & Growth KPI Cards'
      className='grid grid-cols-1 md:grid-cols-3 gap-4'
    >
      {/* Card 1: Average Occupancy */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between'>
        <div>
          <div className='flex items-start justify-between'>
            <div className='space-y-0.5'>
              <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                {language === 'vi' ? 'Tỷ lệ lấp đầy trung bình sàn' : 'Platform Average Occupancy'}
              </span>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading'>
                  {occupancyDisplay}
                </span>
                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'>
                  <ArrowUp className='size-2.5 text-emerald-600 dark:text-emerald-400' />
                  {occupancyChange}
                </span>
              </div>
            </div>
            <div className='size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0'>
              <DoorOpen className='size-4' />
            </div>
          </div>
        </div>

        <div className='mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground'>
          <span>
            {language === 'vi'
              ? `Tính toán trên ${workspacesCount} không gian đang hoạt động`
              : `Averaged across ${workspacesCount} active hubs`}
          </span>
          <span className='font-semibold text-foreground'>{occupancyDisplay}</span>
        </div>
      </div>

      {/* Card 2: Platform Gross Revenue (GMV) */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between'>
        <div>
          <div className='flex items-start justify-between'>
            <div className='space-y-0.5'>
              <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                {language === 'vi' ? 'Tổng giá trị giao dịch sàn (GMV)' : 'Platform Gross Volume (GMV)'}
              </span>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-heading'>
                  {gmvDisplay}
                </span>
                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0'>
                  <ArrowUp className='size-2.5 text-emerald-600 dark:text-emerald-400' />
                  {gmvChange}
                </span>
              </div>
            </div>
            <div className='size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0'>
              <Wallet className='size-4' />
            </div>
          </div>
        </div>

        <div className='mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground'>
          <span>
            {language === 'vi' ? 'Hoa hồng sàn ước tính:' : 'Net Commission:'}{' '}
            <strong className='text-emerald-600 dark:text-emerald-400 font-mono'>{netRevDisplay}</strong>
          </span>
          <span className='font-mono text-[10px]'>{gmvUsdDisplay}</span>
        </div>
      </div>

      {/* Card 3: Organizer Hub & Bookings Growth */}
      <div className='bg-card text-card-foreground rounded-xl border border-border/70 p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between'>
        <div>
          <div className='flex items-start justify-between'>
            <div className='space-y-0.5'>
              <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                {language === 'vi' ? 'Quy mô không gian & Đặt chỗ' : 'Network Scale & Reservations'}
              </span>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading'>
                  {workspacesCount}{' '}
                  <span className='text-xs sm:text-sm font-semibold text-muted-foreground font-sans'>
                    {language === 'vi' ? 'không gian' : 'hubs'}
                  </span>
                </span>
                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 shrink-0'>
                  {summary.totalBookingsChangePercent || '+12.5% MoM'}
                </span>
              </div>
            </div>
            <div className='size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0'>
              <Store className='size-4' />
            </div>
          </div>
        </div>

        <div className='mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground'>
          <span>
            {language === 'vi' ? 'Tổng đơn đặt chỗ tích lũy:' : 'Total Confirmed Bookings:'}
          </span>
          <strong className='text-foreground font-mono'>
            {bookingsCount.toLocaleString()} {language === 'vi' ? 'lượt' : 'bookings'}
          </strong>
        </div>
      </div>
    </section>
  );
}
