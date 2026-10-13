import React from 'react';
import { CalendarCheck2, Users, CheckCircle, Ban, TrendingUp } from 'lucide-react';
import { BookingSummaryKpis } from '../data/mock-bookings';

interface BookingKpiGridProps {
  kpis: BookingSummaryKpis;
}

export function BookingKpiGrid({ kpis }: BookingKpiGridProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {/* KPI 1: Total Today Bookings */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Total Today Bookings</span>
          <div className='p-2 rounded-lg bg-primary/10 text-primary'>
            <CalendarCheck2 className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2.5 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.todayTotalBookings}</span>
          <span className='text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5'>
            <TrendingUp className='size-3.5' aria-hidden='true' /> +{kpis.todayGrowthPercentage}%
          </span>
        </div>
        <div className='text-xs text-muted-foreground flex items-center gap-1.5'>
          <span>Occupancy rate:</span>
          <span className='inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
            Active Concurrency: {kpis.activeConcurrencyRate}%
          </span>
        </div>
      </div>

      {/* KPI 2: Confirmed & Upcoming */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Confirmed &amp; Upcoming</span>
          <div className='p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'>
            <Users className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.confirmedCount}</span>
          <span className='text-xs text-muted-foreground'>Bookings</span>
        </div>
        <div className='text-xs text-muted-foreground flex items-center gap-1.5'>
          <span>RFID Pass Provisioned:</span>
          <strong className='text-foreground font-semibold'>{kpis.rfidComplianceRate}% Compliant</strong>
        </div>
      </div>

      {/* KPI 3: Completed & Checked Out */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Completed &amp; Settled</span>
          <div className='p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.completedCount}</span>
          <span className='text-xs text-muted-foreground'>Past checkouts</span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Average nomad rating: <strong className='text-foreground font-semibold'>4.9 / 5.0 ★</strong>
        </div>
      </div>

      {/* KPI 4: Cancelled / Refunded */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Cancelled / Refunded</span>
          <div className='p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'>
            <Ban className='size-4' aria-hidden='true' />
          </div>
        </div>
        <div className='flex items-baseline gap-2 mb-1.5'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.cancelledCount}</span>
          <span className='text-xs text-muted-foreground'>Resolved</span>
        </div>
        <div className='text-xs text-muted-foreground'>
          Dispute / Escrow hold rate: <strong className='text-foreground font-semibold'>&lt;0.5%</strong>
        </div>
      </div>
    </div>
  );
}
