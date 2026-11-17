import React from 'react';
import { Layers, CheckCircle2, Wrench, CircleDollarSign, TrendingUp, Clock, SlidersHorizontal, Building2 } from 'lucide-react';
import { ResourceKpiSummary } from '../types';

interface ResourceKpiGridProps {
  kpis: ResourceKpiSummary;
}

export function ResourceKpiGrid({ kpis }: ResourceKpiGridProps) {
  return (
    <section aria-label='Resource KPI Overview' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* 1. Total Units */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            Total Units
          </span>
          <span className='p-2 rounded-lg bg-muted text-muted-foreground'>
            <Building2 className='size-4' aria-hidden='true' />
          </span>
        </div>
        <div className='mt-3'>
          <span className='text-3xl font-bold tracking-tight text-foreground font-heading'>
            {kpis.totalUnits}
          </span>
          <div className='flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground font-medium'>
            <Layers className='size-3.5' aria-hidden='true' />
            <span>Floor 12 inventory</span>
          </div>
        </div>
      </div>

      {/* 2. Active & Bookable */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
            Active &amp; Bookable
          </span>
          <span className='p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='size-4' aria-hidden='true' />
          </span>
        </div>
        <div className='mt-3'>
          <span className='text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-heading'>
            {kpis.activeBookable}
          </span>
          <div className='flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600/90 dark:text-emerald-400/90 font-medium'>
            <TrendingUp className='size-3.5' aria-hidden='true' />
            <span>{kpis.uptimePercent}% uptime available</span>
          </div>
        </div>
      </div>

      {/* 3. Maintenance / Inactive */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider'>
            Maintenance / Inactive
          </span>
          <span className='p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
            <Wrench className='size-4' aria-hidden='true' />
          </span>
        </div>
        <div className='mt-3'>
          <span className='text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-heading'>
            {kpis.maintenanceCount}
          </span>
          <div className='flex items-center gap-1.5 mt-1.5 text-xs text-amber-600/90 dark:text-amber-400/90 font-medium'>
            <Clock className='size-3.5' aria-hidden='true' />
            <span>{kpis.maintenanceNote}</span>
          </div>
        </div>
      </div>

      {/* 4. Average Hourly Rate */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-primary uppercase tracking-wider'>
            Average Hourly Rate
          </span>
          <span className='p-2 rounded-lg bg-primary/10 text-primary'>
            <CircleDollarSign className='size-4' aria-hidden='true' />
          </span>
        </div>
        <div className='mt-3'>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-3xl font-bold tracking-tight text-foreground font-heading'>
              ${kpis.averageHourlyRate.toFixed(2)}
            </span>
            <span className='text-xs text-muted-foreground font-normal'>/ hr</span>
          </div>
          <div className='flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground font-medium'>
            <SlidersHorizontal className='size-3.5' aria-hidden='true' />
            <span>Weighted average rate</span>
          </div>
        </div>
      </div>
    </section>
  );
}

