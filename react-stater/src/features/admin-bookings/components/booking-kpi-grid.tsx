import React from 'react';
import {
  CalendarCheck2,
  Users,
  CheckCircle,
  Ban
} from '@/components/ui/hugeicons';

export interface BookingKpiData {
  totalCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  pendingCount?: number;
  totalRevenue?: number;
}

interface BookingKpiGridProps {
  kpis: BookingKpiData;
  language?: 'vi' | 'en';
}

export function BookingKpiGrid({ kpis, language = 'vi' }: BookingKpiGridProps) {
  const isVi = language === 'vi';

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5'>
      {/* KPI 1: Total Bookings */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            {isVi ? 'Tổng đơn đặt chỗ' : 'Total Bookings'}
          </span>
          <div className='p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform'>
            <CalendarCheck2 className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-xl sm:text-2xl font-bold font-mono text-foreground'>
            {kpis.totalCount.toLocaleString('vi-VN')}
          </span>
          <span className='text-[11px] text-muted-foreground'>
            {isVi ? 'đơn' : 'bookings'}
          </span>
        </div>
        <p className='text-[11px] text-muted-foreground truncate'>
          {isVi ? 'Giao dịch trên toàn nền tảng' : 'All platform transactions'}
        </p>
      </div>

      {/* KPI 2: Confirmed & Upcoming */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-indigo-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            {isVi ? 'Chờ nhận chỗ' : 'Confirmed'}
          </span>
          <div className='p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform'>
            <Users className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-xl sm:text-2xl font-bold font-mono text-foreground'>
            {kpis.confirmedCount.toLocaleString('vi-VN')}
          </span>
          <span className='inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400'>
            <span className='size-1.5 rounded-full bg-indigo-500 animate-pulse' />
            {isVi ? 'Sắp tới' : 'Upcoming'}
          </span>
        </div>
        <p className='text-[11px] text-muted-foreground truncate'>
          {isVi ? 'Đã thanh toán, sẵn sàng check-in' : 'Paid & ready for check-in'}
        </p>
      </div>

      {/* KPI 3: Completed & Settled */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            {isVi ? 'Đã hoàn tất' : 'Completed'}
          </span>
          <div className='p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform'>
            <CheckCircle className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-xl sm:text-2xl font-bold font-mono text-foreground'>
            {kpis.completedCount.toLocaleString('vi-VN')}
          </span>
          <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
            <span className='size-1.5 rounded-full bg-emerald-500' />
            {isVi ? 'Đã trả chỗ' : 'Settled'}
          </span>
        </div>
        <p className='text-[11px] text-muted-foreground truncate'>
          {isVi ? 'Đã trả chỗ & giải ngân đối soát' : 'Past checkouts & settled'}
        </p>
      </div>

      {/* KPI 4: Cancelled / Refunded */}
      <div className='group bg-card p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-2xs hover:border-rose-500/40 hover:shadow-xs transition-all'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            {isVi ? 'Đã hủy / Hoàn tiền' : 'Cancelled'}
          </span>
          <div className='p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform'>
            <Ban className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-xl sm:text-2xl font-bold font-mono text-foreground'>
            {kpis.cancelledCount.toLocaleString('vi-VN')}
          </span>
          <span className='text-[11px] text-muted-foreground'>
            {isVi ? 'đã xử lý' : 'resolved'}
          </span>
        </div>
        <p className='text-[11px] text-muted-foreground truncate'>
          {isVi ? 'Đã hủy hoặc giải quyết hoàn phí' : 'Cancelled or refunded'}
        </p>
      </div>
    </div>
  );
}
