import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_REPORTS_KPIS } from '@/features/admin-reports/data/mock-reports-overview';
import { ReportsKpiGrid } from '@/features/admin-reports/components/reports-kpi-grid';
import { ReportsCategoryChart } from '@/features/admin-reports/components/reports-category-chart';
import { ReportsSlaCard } from '@/features/admin-reports/components/reports-sla-card';
import { ReportsRecentQueue } from '@/features/admin-reports/components/reports-recent-queue';

const reportsSearchSchema = z.object({
  timeRange: z.string().optional().default('30d')
});

export const Route = createFileRoute('/dashboard/admin/reports')({
  head: () => ({
    meta: [
      { title: 'A11 — Reports & Complaints Overview | NexSpace Console' },
      {
        name: 'description',
        content:
          'Customer complaints, property damage reports, and organizer conduct monitoring across Southeast Asia nodes.'
      }
    ]
  }),
  validateSearch: zodValidator(reportsSearchSchema),
  component: ReportsComplaintsOverviewPage
});

function handleExportAuditLog() {
  toast.success('Incident Audit Log Exported (CSV)', {
    description: 'Generated immutable audit log for 43 incident triage records and SLA reports.'
  });
}

function ReportsComplaintsOverviewPage() {
  return (
    <PageContainer
      pageTitle='Reports & Disputes Overview'
      pageDescription='Customer complaints, property damage reports, and organizer conduct monitoring across Southeast Asia nodes.'
    >
      {/* Page Header Actions */}
      <div className='flex items-center justify-end gap-3 mb-6 -mt-12 sm:mt-0'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleExportAuditLog}
          className='flex items-center gap-2 h-9 text-xs font-semibold'
        >
          <Download className='size-3.5' />
          <span>Export Audit Log</span>
        </Button>

        <Button
          asChild
          size='sm'
          className='flex items-center gap-2 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
        >
          <Link to='/dashboard/admin/disputes'>
            <span>Open Dispute Queue</span>
            <ArrowRight className='size-3.5 ml-1' />
          </Link>
        </Button>
      </div>

      {/* Section 1: KPI Grid */}
      <ReportsKpiGrid kpis={MOCK_REPORTS_KPIS} />

      {/* Section 2: Categorization & SLA Breakdown */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <ReportsCategoryChart />
        <ReportsSlaCard />
      </section>

      {/* Section 3: Recent Dispute Priority Submissions */}
      <ReportsRecentQueue />
    </PageContainer>
  );
}
