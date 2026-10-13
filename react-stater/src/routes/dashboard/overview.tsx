import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { MOCK_OVERVIEW_DATA } from '@/features/admin-overview/data/mock-overview';
import { AdminKpiRow } from '@/features/admin-overview/components/admin-kpi-row';
import { PriorityTriageGrid } from '@/features/admin-overview/components/priority-triage-grid';
import { OperationalTrendsChart } from '@/features/admin-overview/components/operational-trends-chart';
import { LiveSystemAlerts } from '@/features/admin-overview/components/live-system-alerts';
import { TimeRangeFilter } from '@/features/admin-overview/components/time-range-filter';

export const Route = createFileRoute('/dashboard/overview')({
  head: () => ({
    meta: [
      { title: 'A01 — Administrator Dashboard | NexSpace Console' },
      { name: 'description', content: 'Real-time platform operations and priority triage.' }
    ]
  }),
  component: AdministratorDashboardPage
});

function AdministratorDashboardPage() {
  const [selectedRange, setSelectedRange] = useState<'today' | '7d' | '30d'>('7d');
  const currentData = MOCK_OVERVIEW_DATA[selectedRange] || MOCK_OVERVIEW_DATA['7d'];

  return (
    <PageContainer>
      <div className='flex flex-col min-h-screen pb-12 min-w-0 w-full'>
        {/* Page Header Row */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground font-heading'>
              Administrator Dashboard
            </h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              Real-time platform operations and priority triage.
            </p>
          </div>

          <TimeRangeFilter
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </div>

        {/* 3. Core KPI Bento Row (5 Cards) */}
        <AdminKpiRow kpis={currentData.kpis} />

        {/* 4. Priority Triage Section (3 Cards) */}
        <PriorityTriageGrid items={currentData.triageItems} />

        {/* 5. Operational Trends & System Alerts (60/40 Grid) */}
        <section className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          <div className='lg:col-span-7'>
            <OperationalTrendsChart
              trendPoints={currentData.trendPoints}
              summary={currentData.volumeSummary}
            />
          </div>

          <div className='lg:col-span-5'>
            <LiveSystemAlerts initialAlerts={currentData.alerts} />
          </div>
        </section>

        {/* Supplementary Footnote */}
        <div className='mt-8 pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2'>
          <div className='flex items-center gap-2'>
            <span>NexSpace Platform Operations v4.19.2-rc4</span>
            <span>•</span>
            <span>Hardware Enclave HSM Active</span>
            <span>•</span>
            <span className='font-mono'>Zone: ap-southeast-1a</span>
          </div>
          <div>All operational metrics cryptographically verified</div>
        </div>
      </div>
    </PageContainer>
  );
}
