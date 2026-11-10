import React from 'react';
import { Users, Building2, CheckCircle2, CalendarCheck2 } from 'lucide-react';
import { WorkspaceKpis } from '../data/mock-workspaces';

interface WorkspaceStatusKpiGridProps {
  kpis: WorkspaceKpis;
}

export function WorkspaceStatusKpiGrid({ kpis }: WorkspaceStatusKpiGridProps) {
  const totalUsers = kpis.totalPlatformUsers ?? 0;
  const activeOrganizers = kpis.activeOrganizers ?? 0;
  const activeWorkspaces = kpis.activeWorkspaces ?? kpis.activeCount ?? kpis.totalPublishedSpaces ?? 0;
  const totalBookings = kpis.totalBookings ?? 0;

  return (
    <section aria-label='Platform & Workspace System Metrics' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {/* KPI 1: Total Platform Users */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Total Platform Users</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'>
            <Users className='size-3' aria-hidden='true' />
            System-Wide
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            {totalUsers.toLocaleString('en-US')}
          </span>
          <span className='text-xs text-muted-foreground font-mono'>Registered accounts</span>
        </div>
        <p className='text-xs text-muted-foreground'>
          Total customers, organizers, and administrators on NexSpace
        </p>
      </div>

      {/* KPI 2: Active Organizers */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Active Organizers</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'>
            <Building2 className='size-3' aria-hidden='true' />
            Verified Partners
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            {activeOrganizers.toLocaleString('en-US')}
          </span>
          <span className='text-xs text-muted-foreground font-mono'>Active operators</span>
        </div>
        <p className='text-xs text-muted-foreground'>
          Workspace operators with active accounts managing spaces
        </p>
      </div>

      {/* KPI 3: Active Workspaces */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Active Workspaces</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'>
            <CheckCircle2 className='size-3' aria-hidden='true' />
            Auto-Approved &amp; Live
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            {activeWorkspaces.toLocaleString('en-US')}
          </span>
          <span className='text-xs text-muted-foreground font-mono'>
            {kpis.totalWorkspaces != null ? `of ${kpis.totalWorkspaces} total` : 'Live on marketplace'}
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>
          {kpis.pendingCount ? `${kpis.pendingCount} pending · ` : ''}
          {kpis.maintenanceCount ? `${kpis.maintenanceCount} maintenance · ` : ''}
          {kpis.draftCount ? `${kpis.draftCount} draft` : 'Publicly bookable workspaces'}
        </p>
      </div>

      {/* KPI 4: Total Bookings */}
      <div className='bg-card p-5 rounded-xl border border-border shadow-2xs hover:border-primary/40 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-medium text-muted-foreground'>Total Bookings</span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'>
            <CalendarCheck2 className='size-3' aria-hidden='true' />
            Platform Volume
          </span>
        </div>
        <div className='flex items-baseline gap-3 mb-2'>
          <span className='text-2xl lg:text-3xl font-bold font-heading text-foreground'>
            {totalBookings.toLocaleString('en-US')}
          </span>
          <span className='text-xs text-muted-foreground font-mono'>All workspaces</span>
        </div>
        <p className='text-xs text-muted-foreground'>
          Cumulative bookings recorded across all workspaces in the system
        </p>
      </div>
    </section>
  );
}
