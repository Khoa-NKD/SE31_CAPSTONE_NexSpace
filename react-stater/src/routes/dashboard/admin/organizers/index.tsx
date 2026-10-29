import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  MOCK_ORGANIZER_KPIS,
  MOCK_DAILY_THROUGHPUT,
  MOCK_DROPOFF_ISSUES
} from '@/features/admin-organizers/data/mock-organizers';
import { OrganizerKpiGrid } from '@/features/admin-organizers/components/organizer-kpi-grid';
import { ThroughputAnalytics } from '@/features/admin-organizers/components/throughput-analytics';
import { VerificationIssuesCard } from '@/features/admin-organizers/components/verification-issues-card';
import { RecentSubmissionsTable } from '@/features/admin-organizers/components/recent-submissions-table';

export const Route = createFileRoute('/dashboard/admin/organizers/')({
  head: () => ({
    meta: [
      { title: 'A04 — Organizer Verification Overview | NexSpace Admin Console' },
      {
        name: 'description',
        content: 'Overview of partner onboarding pipeline, compliance triage, and verification workload.'
      }
    ]
  }),
  component: OrganizerVerificationOverviewPage
});

function handleExportReport() {
  toast.success('Verification Report Exported (Simulated)', {
    description: 'Downloaded encrypted partner compliance audit log for the last 30 days.'
  });
}

function OrganizerVerificationOverviewPage() {
  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full'>
        {/* Main Headline & Global Header Actions */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Organizer KYC Verification
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Overview of partner onboarding pipeline, compliance triage, and verification workload.
            </p>
          </div>

          {/* Action Area */}
          <div className='flex items-center gap-3'>
            {/* Outline Secondary Button */}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleExportReport}
              className='gap-2 shadow-2xs'
            >
              <Download className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Export Verification Report</span>
            </Button>

            {/* Primary Indigo CTA: Deep link to A05 Queue */}
            <Button asChild size='sm' className='gap-2 bg-primary hover:bg-primary/90 text-white shadow-2xs'>
              <Link to='/dashboard/admin/organizers/queue'>
                <span>Open Verification Queue</span>
                <ArrowRight className='size-4' aria-hidden='true' />
              </Link>
            </Button>
          </div>
        </div>

        {/* 3.2 ONBOARDING FUNNEL STATUS CARDS (4-Column Bento Grid) */}
        <OrganizerKpiGrid kpis={MOCK_ORGANIZER_KPIS} />

        {/* 3.3 ANALYTICS & INSIGHT SECTION (12-Column Responsive Grid) */}
        <section aria-label='Verification Analytics' className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          <ThroughputAnalytics data={MOCK_DAILY_THROUGHPUT} kpis={MOCK_ORGANIZER_KPIS} />
          <VerificationIssuesCard issues={MOCK_DROPOFF_ISSUES} />
        </section>

        {/* 3.4 RECENT VERIFICATION SUBMISSIONS TABLE */}
        <RecentSubmissionsTable />
      </div>
    </PageContainer>
  );
}
