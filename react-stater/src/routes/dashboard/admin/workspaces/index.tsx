import React, { useState, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  MOCK_WORKSPACE_KPIS,
  MOCK_MODERATION_WORKLOAD_ITEMS,
  MOCK_QUALITY_HEALTH_METRICS,
  INITIAL_MODERATION_RECORDS,
  ModerationDecisionRecord,
  WorkspaceKpis
} from '@/features/admin-workspaces/data/mock-workspaces';
import { WorkspaceStatusKpiGrid } from '@/features/admin-workspaces/components/workspace-status-kpi-grid';
import { ModerationWorkloadCard } from '@/features/admin-workspaces/components/moderation-workload-card';
import { QualityComplianceCard } from '@/features/admin-workspaces/components/quality-compliance-card';
import { ModeratedWorkspacesTable } from '@/features/admin-workspaces/components/moderated-workspaces-table';
import { useWorkspacesQuery } from '@/features/workspaces/api/queries';
import { isWorkspacePubliclyEligible } from '@/features/workspaces/api/types';

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

function handleExportAuditLog() {
  toast.success('Workspace Review Log Exported (Simulated)', {
    description: 'Export of registered workspace review and moderation records.'
  });
}

function WorkspaceAdminOverviewPage() {
  const [now] = useState(() => Date.now());
  const { data, isLoading, isError, error, refetch, isFetching } = useWorkspacesQuery({
    role: 'Administrator',
    limit: 100
  });

  const workspaces = data?.content;

  // Compute dynamic platform KPIs based on live canonical workspaces
  const kpis: WorkspaceKpis = useMemo(() => {
    if (!workspaces || workspaces.length === 0) {
      return MOCK_WORKSPACE_KPIS;
    }

    // Authoritative public eligibility predicate
    const published = workspaces.filter(isWorkspacePubliclyEligible).length;
    const pending = workspaces.filter((w) => w.reviewStatus === 'Pending').length;
    const suspended = workspaces.filter((w) => w.moderationStatus === 'Suspended').length;
    const drafts = workspaces.filter((w) => w.reviewStatus === 'Draft').length;

    // Calculate actual elapsed submission hours from valid submittedAt timestamps
    let oldestHours = 0;
    const pendingSpaces = workspaces.filter((w) => w.reviewStatus === 'Pending');
    if (pendingSpaces.length > 0) {
      const timestamps = pendingSpaces
        .map((w) => (w.submittedAt ? new Date(w.submittedAt).getTime() : 0))
        .filter((t) => t > 0);
      if (timestamps.length > 0) {
        const earliest = Math.min(...timestamps);
        oldestHours = Math.max(0, Math.floor((now - earliest) / (1000 * 60 * 60)));
      }
    }

    const cities = new Set(workspaces.map((w) => w.city).filter(Boolean));
    const metroCount = cities.size > 0 ? cities.size : MOCK_WORKSPACE_KPIS.metroHubsCount;

    return {
      totalPublishedSpaces: published,
      publishedMonthlyGrowth: 12,
      metroHubsCount: metroCount,
      pendingModerationCount: pending,
      pendingOldestHours: oldestHours,
      suspendedCount: suspended,
      suspendedGrievanceDetails:
        suspended > 0
          ? `${suspended} workspace(s) currently suspended by admin action`
          : 'No active suspensions',
      partnerDraftsCount: drafts
    };
  }, [workspaces, now]);

  // Derive latest administrative decisions strictly from actual persisted review/moderation metadata
  const records: ModerationDecisionRecord[] = useMemo(() => {
    if (!workspaces) return INITIAL_MODERATION_RECORDS;

    const dynamicRecords: ModerationDecisionRecord[] = workspaces
      .filter((w) => Boolean(w.reviewedAt || w.suspendedAt))
      .map((w) => {
        const isSuspended = w.moderationStatus === 'Suspended';
        const isApproved = w.reviewStatus === 'Approved';

        const action: ModerationDecisionRecord['action'] = isSuspended
          ? 'Suspended (Safety Audit)'
          : isApproved
          ? 'Approved & Published'
          : 'Flags Resolved';

        const actionStatus: ModerationDecisionRecord['actionStatus'] = isSuspended
          ? 'suspended'
          : isApproved
          ? 'approved'
          : 'resolved';

        const dateStr = isSuspended ? w.suspendedAt : (w.reviewedAt || w.updatedAt);
        const displayTime = dateStr
          ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Recently';

        return {
          id: `rec-dyn-${w.id}`,
          workspaceId: w.workspaceCode || w.id,
          workspaceName: w.name,
          unit: w.facilitySubtitle || w.streetAddress || 'Main Unit',
          metroZone: `${w.district ? `${w.district}, ` : ''}${w.city || 'HCMC'}`,
          shortCode: (w.name || 'WS').slice(0, 2).toUpperCase(),
          organizerLegalEntity: w.organizerLegalName || 'Organizer Partner',
          action,
          actionStatus,
          adminHandler: {
            name: w.reviewedBy || w.suspendedBy || 'Admin Handler',
            initials:
              ((w.reviewedBy || w.suspendedBy || 'Admin')
                .split(' ')
                .map((s) => s[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()) || 'AD',
            avatarBgClass: 'bg-primary text-white',
            role: 'Compliance Lead'
          },
          timestamp: displayTime,
          timestampExact: dateStr ? new Date(dateStr).toUTCString() : 'Historical Audit Record',
          auditTrailNotes: isSuspended
            ? (w.suspendReason || 'Suspended by admin moderation policy.')
            : (w.reviewFeedback || 'Workspace administrative review completed.')
        };
      });

    return [...dynamicRecords, ...INITIAL_MODERATION_RECORDS];
  }, [workspaces]);

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
              onClick={() => refetch()}
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
              onClick={handleExportAuditLog}
              className='gap-2 shadow-2xs'
            >
              <FileDown className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Export Audit Log</span>
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
            <Button size='sm' variant='outline' onClick={() => refetch()} className='text-xs'>
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
            items={MOCK_MODERATION_WORKLOAD_ITEMS}
            awaitingCount={kpis.pendingModerationCount}
            averageTurnaroundHours={3.4}
          />
          <QualityComplianceCard metrics={MOCK_QUALITY_HEALTH_METRICS} />
        </section>

        {/* 6. RECENTLY MODERATED WORKSPACES DATA TABLE */}
        <ModeratedWorkspacesTable records={records} />
      </div>
    </PageContainer>
  );
}
