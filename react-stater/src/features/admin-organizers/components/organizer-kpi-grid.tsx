import React from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';
import { OrganizerPipelineKpis } from '../data/mock-organizers';

interface OrganizerKpiGridProps {
  kpis: OrganizerPipelineKpis;
}

export function OrganizerKpiGrid({ kpis }: OrganizerKpiGridProps) {
  return (
    <section aria-label='Verification Pipeline Metrics' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* Metric 1: Pending Initial Review */}
      <div className='bg-card rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-shadow'>
        <div className='flex items-center justify-between'>
          <div className='w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400'>
            <Clock className='size-5' aria-hidden='true' />
          </div>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold'>
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' aria-hidden='true'></span>
            Needs Action
          </span>
        </div>
        <div className='mt-4'>
          <div className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight leading-none'>
            {kpis.pendingInitialReviewCount} Applications
          </div>
          <div className='flex items-center gap-1 text-xs text-muted-foreground mt-2'>
            <span>Oldest pending: <strong className='text-foreground font-medium'>{kpis.pendingOldestHours}h ago</strong></span>
            <span>•</span>
            <span className='text-amber-700 dark:text-amber-400 font-medium'>SLA target &lt;24h</span>
          </div>
        </div>
      </div>

      {/* Metric 2: Under Investigation / Re-submission */}
      <div className='bg-card rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-shadow'>
        <div className='flex items-center justify-between'>
          <div className='w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400'>
            <RefreshCw className='size-5' aria-hidden='true' />
          </div>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold'>
            <span className='w-1.5 h-1.5 rounded-full bg-indigo-500' aria-hidden='true'></span>
            Documents Requested
          </span>
        </div>
        <div className='mt-4'>
          <div className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight leading-none'>
            {kpis.underInvestigationCount} Applications
          </div>
          <div className='text-xs text-muted-foreground mt-2'>
            Awaiting legal entity re-uploads
          </div>
        </div>
      </div>

      {/* Metric 3: Approved Partners (Last 30d) */}
      <div className='bg-card rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-shadow'>
        <div className='flex items-center justify-between'>
          <div className='w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='size-5' aria-hidden='true' />
          </div>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
            {kpis.passRatePercentage}% Pass Rate
          </span>
        </div>
        <div className='mt-4'>
          <div className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight leading-none'>
            {kpis.approvedCountLast30d} Partners
          </div>
          <div className='flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-2'>
            <TrendingUp className='size-3.5' aria-hidden='true' />
            <span>+{kpis.momGrowthPercentage}% MoM growth in verified hosts</span>
          </div>
        </div>
      </div>

      {/* Metric 4: Rejected / Non-compliant */}
      <div className='bg-card rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-shadow'>
        <div className='flex items-center justify-between'>
          <div className='w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200/60 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400'>
            <AlertOctagon className='size-5' aria-hidden='true' />
          </div>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold'>
            <span className='w-1.5 h-1.5 rounded-full bg-red-500' aria-hidden='true'></span>
            Flagged Risks
          </span>
        </div>
        <div className='mt-4'>
          <div className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight leading-none'>
            {kpis.rejectedRisksCount} Applications
          </div>
          <div className='text-xs text-muted-foreground mt-2 truncate' title='Sanctions check / Invalid corporate license'>
            Sanctions check / Invalid corporate license
          </div>
        </div>
      </div>
    </section>
  );
}
