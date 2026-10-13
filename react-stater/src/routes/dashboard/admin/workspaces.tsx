import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  MOCK_WORKSPACE_KPIS,
  MOCK_MODERATION_WORKLOAD_ITEMS,
  MOCK_QUALITY_HEALTH_METRICS,
  INITIAL_MODERATION_RECORDS,
  ModerationDecisionRecord
} from '@/features/admin-workspaces/data/mock-workspaces';
import { WorkspaceStatusKpiGrid } from '@/features/admin-workspaces/components/workspace-status-kpi-grid';
import { ModerationWorkloadCard } from '@/features/admin-workspaces/components/moderation-workload-card';
import { QualityComplianceCard } from '@/features/admin-workspaces/components/quality-compliance-card';
import { ModeratedWorkspacesTable } from '@/features/admin-workspaces/components/moderated-workspaces-table';

const workspacesSearchSchema = z.object({
  search: z.string().optional(),
  filter: z.string().optional(),
  zone: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/workspaces')({
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
  toast.success('Workspace Audit Log Exported (Simulated)', {
    description: 'Compiled cryptographic lifecycle and moderation logs across 618 published spaces.'
  });
}

function handleManageDirectory() {
  toast.info('Workspace Directory (Simulated)', {
    description: 'Navigating to full workspace directory inventory catalogue.'
  });
}

function WorkspaceAdminOverviewPage() {
  const [records] = useState<ModerationDecisionRecord[]>(INITIAL_MODERATION_RECORDS);

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
              onClick={handleExportAuditLog}
              className='gap-2 shadow-2xs'
            >
              <FileDown className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Export Audit Log</span>
            </Button>

            <Button
              size='sm'
              onClick={handleManageDirectory}
              className='gap-2 bg-primary hover:bg-primary/90 text-white shadow-2xs'
            >
              <span>Manage Workspace Directory</span>
              <ArrowRight className='size-4' aria-hidden='true' />
            </Button>
          </div>
        </div>

        {/* 4. WORKSPACE STATUS DISTRIBUTION KPI TILES (4-Card Grid) */}
        <WorkspaceStatusKpiGrid kpis={MOCK_WORKSPACE_KPIS} />

        {/* 5. OPERATIONAL WORKLOAD SUMMARY (2-Column Dense Grid) */}
        <section aria-label='Operational Workload & Compliance' className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <ModerationWorkloadCard
            items={MOCK_MODERATION_WORKLOAD_ITEMS}
            awaitingCount={MOCK_WORKSPACE_KPIS.pendingModerationCount}
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
