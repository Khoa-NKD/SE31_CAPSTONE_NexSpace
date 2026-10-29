import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { CommissionKpiCards } from '@/features/admin-commissions/components/commission-kpi-cards';
import { GtvRevenueChart } from '@/features/admin-commissions/components/gtv-revenue-chart';
import { StatutoryComplianceCard } from '@/features/admin-commissions/components/statutory-compliance-card';
import { CommissionRulesTable } from '@/features/admin-commissions/components/commission-rules-table';

export const Route = createFileRoute('/dashboard/admin/commissions/')({
  head: () => ({
    meta: [
      { title: 'A13 — Commission & Fees Overview | NexSpace Admin Console' },
      {
        name: 'description',
        content: 'Overview of active monetization rules and transaction take-rates across regional workspace hubs.'
      }
    ]
  }),
  component: CommissionOverviewPage
});

function handleExportFeePolicy() {
  toast.success('Fee Policy Exported (Simulated)', {
    description: 'Downloaded official NexSpace Platform Fee Policy (PDF) v2.4.1.'
  });
}

function CommissionOverviewPage() {
  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full'>
        {/* Top Breadcrumb & Header Section */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border'>
          <div>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1.5'>
              <span>Platform Ops</span>
              <span>/</span>
              <span>Commercial &amp; Ledger</span>
              <span>/</span>
              <span className='text-foreground font-semibold'>Commission Overview</span>
            </div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Platform Commission &amp; Fee Structure
            </h1>
            <p className='text-xs text-muted-foreground mt-1'>
              Overview of active monetization rules and transaction take-rates across regional workspace hubs.
            </p>
          </div>

          {/* Action CTAs */}
          <div className='flex items-center gap-3 self-start md:self-auto'>
            <Button
              variant='outline'
              onClick={handleExportFeePolicy}
              className='text-xs font-semibold gap-2 shadow-xs'
            >
              <FileText className='size-3.5 text-primary' />
              <span>Export Fee Policy (PDF)</span>
            </Button>
            <Link to='/dashboard/admin/commissions/rules'>
              <Button className='text-xs font-bold gap-2 shadow-xs'>
                <span>Configure Fee Rules</span>
                <ArrowRight className='size-3.5' />
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. Active Fee Structure Tiles (Bento Hero Cards) */}
        <CommissionKpiCards />

        {/* 2. Historical Fee Impact Summary & Schedule (7:5 Split) */}
        <div className='grid grid-cols-12 gap-6'>
          <div className='col-span-12 lg:col-span-7'>
            <GtvRevenueChart />
          </div>
          <div className='col-span-12 lg:col-span-5'>
            <StatutoryComplianceCard />
          </div>
        </div>

        {/* 3. Effective Fee Rules Ledger Table */}
        <CommissionRulesTable />
      </div>
    </PageContainer>
  );
}
