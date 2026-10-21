import React from 'react';
import { TrendingUp } from 'lucide-react';
import { WorkspaceKpis } from '../data/mock-workspaces';

interface WorkspaceStatusKpiGridProps {
  kpis: WorkspaceKpis;
}

export function WorkspaceStatusKpiGrid({ kpis }: WorkspaceStatusKpiGridProps) {
  return (
    <section aria-label='Workspace Status Metrics' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {/* KPI 1: Published */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Total Published Spaces</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
            Active &amp; Bookable
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.totalPublishedSpaces}</span>
          {kpis.publishedMonthlyGrowth != null && kpis.publishedMonthlyGrowth > 0 ? (
            <span className='text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5'>
              <TrendingUp className='size-3.5' aria-hidden='true' /> +{kpis.publishedMonthlyGrowth} this mo
            </span>
          ) : (
            <span className='text-xs text-muted-foreground font-mono'>
              Growth data unavailable
            </span>
          )}
        </div>
        <p className='text-xs text-muted-foreground'>
          {kpis.totalWorkspaces != null && kpis.totalWorkspaces > 0
            ? `${kpis.totalWorkspaces} total registered · ${kpis.metroHubsCount} active metro hub${kpis.metroHubsCount === 1 ? '' : 's'}`
            : kpis.metroHubsCount > 0
            ? `Distributed across ${kpis.metroHubsCount} active metro hub${kpis.metroHubsCount === 1 ? '' : 's'}`
            : 'No active metro hubs'}
        </p>
      </div>

      {/* KPI 2: Pending Moderation */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Pending First-Time Review</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'>
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' aria-hidden='true'></span>
            Action Needed
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.pendingModerationCount}</span>
          <span className='font-mono text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded font-semibold'>
            Pending Review
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>
          {kpis.pendingModerationCount > 0
            ? `Oldest submission elapsed: ${kpis.pendingOldestHours}h`
            : 'No submissions awaiting review'}
        </p>
      </div>

      {/* KPI 3: Suspended / Violations */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Suspended / Violations</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'>
            <span className='w-1.5 h-1.5 rounded-full bg-rose-500' aria-hidden='true'></span>
            Immediate Attention
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-rose-600 dark:text-rose-400'>{kpis.suspendedCount}</span>
          <span className='text-xs text-muted-foreground'>Restricted listings</span>
        </div>
        <p className='text-xs text-muted-foreground truncate' title={kpis.suspendedGrievanceDetails}>
          {kpis.suspendedGrievanceDetails}
        </p>
      </div>

      {/* KPI 4: Partner Drafts */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Drafts In Pipeline</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border'>
            <span className='w-1.5 h-1.5 rounded-full bg-slate-400' aria-hidden='true'></span>
            Partner Drafts
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>{kpis.partnerDraftsCount}</span>
          <span className='text-xs text-muted-foreground'>In pre-release setup</span>
        </div>
        <p className='text-xs text-muted-foreground'>Operators finalizing floor plans &amp; amenity tags</p>
      </div>
    </section>
  );
}
