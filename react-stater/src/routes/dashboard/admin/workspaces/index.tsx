import React, { useState, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import {
  MOCK_QUALITY_HEALTH_METRICS,
  ModerationDecisionRecord,
  WorkspaceKpis,
  ModerationWorkloadItem,
  computeWorkspaceKpis,
  deriveModerationWorkloadItems,
  deriveModerationDecisionRecords
} from '@/features/admin-workspaces/data/mock-workspaces';
import { WorkspaceStatusKpiGrid } from '@/features/admin-workspaces/components/workspace-status-kpi-grid';
import { ModerationWorkloadCard } from '@/features/admin-workspaces/components/moderation-workload-card';
import { QualityComplianceCard } from '@/features/admin-workspaces/components/quality-compliance-card';
import { ModeratedWorkspacesTable } from '@/features/admin-workspaces/components/moderated-workspaces-table';
import { useWorkspacesQuery, useAdminWorkspaceKpisQuery } from '@/features/workspaces/api/queries';

const workspacesSearchSchema = z.object({
  search: z.string().optional(),
  filter: z.string().optional(),
  zone: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/workspaces/')({
  head: () => ({
    meta: [
      { title: 'A06 — Workspace Administration Overview | NexSpace Console' },
      {
        name: 'description',
        content: 'Platform-level workspace lifecycle, moderation throughput, and compliance oversight.'
      }
    ]
  }),
  validateSearch: zodValidator(workspacesSearchSchema),
  component: WorkspaceAdminOverviewPage
});

function WorkspaceAdminOverviewPage() {
  const [now] = useState(() => Date.now());
  const {
    data: kpisData,
    isLoading: isKpisLoading,
    isError: isKpisError,
    error: kpisError,
    refetch: refetchKpis,
    isFetching: isKpisFetching
  } = useAdminWorkspaceKpisQuery();

  const {
    data,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
    isFetching: isListFetching
  } = useWorkspacesQuery({
    role: 'Administrator',
    limit: 100
  });

  const isFetching = isKpisFetching || isListFetching;
  const isLoading = isKpisLoading && isListLoading;
  const isError = isKpisError && isListError;
  const error = kpisError || listError;

  const handleRefresh = () => {
    refetchKpis();
    refetchList();
  };

  const workspaces = data?.content;

  // Primary platform KPIs from authoritative dedicated server aggregation endpoint (/admin/workspaces/kpis)
  // Computes aggregates from 100% of canonical records independently of the 100-record list limit.
  const kpis: WorkspaceKpis = useMemo(() => {
    if (kpisData) {
      return kpisData;
    }
    return computeWorkspaceKpis(workspaces, now);
  }, [kpisData, workspaces, now]);

  // Derive operational moderation workload items strictly from canonical workspaces
  const workloadItems: ModerationWorkloadItem[] = useMemo(() => deriveModerationWorkloadItems(workspaces), [workspaces]);

  // Derive latest administrative decisions strictly from genuine persisted review/moderation metadata
  const records: ModerationDecisionRecord[] = useMemo(() => deriveModerationDecisionRecords(workspaces), [workspaces]);

  return (
    <PageContainer>
      <div className='max-w-[1360px] mx-auto w-full'>
        {/* Top Breadcrumbs & Page Action Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Workspace Administration
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Platform-level workspace lifecycle, moderation throughput, and compliance oversight.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={isFetching}
              className='gap-2 shadow-2xs'
              aria-label='Refresh overview data'
            >
              <RotateCcw className={`size-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} aria-hidden='true' />
              <span className='hidden sm:inline'>Refresh</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              disabled
              className='gap-2 shadow-2xs opacity-60 cursor-not-allowed'
              title='Audit log export is not currently available'
              aria-disabled='true'
            >
              <FileDown className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Export Audit Log (Unavailable)</span>
            </Button>

            <Button
              size='sm'
              asChild
              className='gap-2 bg-primary hover:bg-primary/90 text-white shadow-2xs'
            >
              <Link to='/dashboard/admin/workspaces/directory'>
                <span>Manage Workspace Directory</span>
                <ArrowRight className='size-4' aria-hidden='true' />
              </Link>
            </Button>
          </div>
        </div>

        {/* Error Alert if query fails */}
        {isError && (
          <div className='mb-6 p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <AlertTriangle className='size-5 text-rose-600 shrink-0' />
              <div className='text-xs'>
                <p className='font-semibold'>Failed to synchronize workspace metrics</p>
                <p className='text-muted-foreground'>{error instanceof Error ? error.message : 'Workspace API error'}</p>
              </div>
            </div>
            <Button size='sm' variant='outline' onClick={handleRefresh} className='text-xs'>
              Retry
            </Button>
          </div>
        )}

        {/* Loading Indicator bar */}
        {isLoading && (
          <div className='mb-6 p-4 rounded-xl border border-border bg-card flex items-center justify-center gap-3 text-xs text-muted-foreground'>
            <Loader2 className='size-4 animate-spin text-primary' />
            <span>Loading live workspace metrics and moderation workload...</span>
          </div>
        )}

        {/* 4. WORKSPACE STATUS DISTRIBUTION KPI TILES (4-Card Grid) */}
        <WorkspaceStatusKpiGrid kpis={kpis} />

        {/* 5. OPERATIONAL WORKLOAD SUMMARY (2-Column Dense Grid) */}
        <section aria-label='Operational Workload & Compliance' className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <ModerationWorkloadCard
            items={workloadItems}
            awaitingCount={kpis.pendingModerationCount}
          />
          <QualityComplianceCard metrics={MOCK_QUALITY_HEALTH_METRICS} />
        </section>

        {/* 6. RECENTLY MODERATED WORKSPACES DATA TABLE */}
        <ModeratedWorkspacesTable records={records} />
      </div>
    </PageContainer>
  );
}
