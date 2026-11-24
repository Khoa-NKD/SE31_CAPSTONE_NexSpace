import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, Settings } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { CommissionKpiCards } from '@/features/admin-commissions/components/commission-kpi-cards';
import { GtvRevenueChart } from '@/features/admin-commissions/components/gtv-revenue-chart';
import { StatutoryComplianceCard } from '@/features/admin-commissions/components/statutory-compliance-card';
import { CommissionRulesTable } from '@/features/admin-commissions/components/commission-rules-table';
import { useLanguage } from '@/features/landing/context/language-context';

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

function CommissionOverviewPage() {
  const { language } = useLanguage();

  function handleExportFeePolicy() {
    toast.success(
      language === 'vi' ? 'Đã xuất chính sách biểu phí (Mô phỏng)' : 'Fee Policy Exported (Simulated)',
      {
        description:
          language === 'vi'
            ? 'Đã tải xuống văn bản Quy định Biểu phí & Hoa hồng Sàn NexSpace (PDF) v2.4.1.'
            : 'Downloaded official NexSpace Platform Fee Policy (PDF) v2.4.1.'
      }
    );
  }

  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-10'>
        {/* Top Breadcrumb & Header Section */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/70'>
          <div>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1.5'>
              <span>{language === 'vi' ? 'Vận hành hệ thống' : 'Platform Ops'}</span>
              <span>/</span>
              <span>{language === 'vi' ? 'Thương mại & Sổ cái' : 'Commercial & Ledger'}</span>
              <span>/</span>
              <span className='text-foreground font-semibold'>
                {language === 'vi' ? 'Tổng quan Biểu phí' : 'Commission Overview'}
              </span>
            </div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading'>
              {language === 'vi'
                ? 'Chính sách Hoa hồng & Biểu phí Nền tảng'
                : 'Platform Commission & Fee Structure'}
            </h1>
            <p className='text-xs text-muted-foreground mt-1'>
              {language === 'vi'
                ? 'Tổng quan về các quy tắc kiếm tiền, tỷ lệ hoa hồng (take-rate) và phân bổ dòng tiền trên toàn bộ không gian.'
                : 'Overview of active monetization rules and transaction take-rates across regional workspace hubs.'}
            </p>
          </div>

          {/* Action CTAs */}
          <div className='flex items-center gap-2.5 self-start md:self-auto'>
            <Button
              variant='outline'
              onClick={handleExportFeePolicy}
              className='text-xs font-semibold gap-1.5 shadow-2xs h-8.5'
            >
              <FileText className='size-3.5 text-primary' />
              <span>
                {language === 'vi' ? 'Xuất chính sách phí (PDF)' : 'Export Fee Policy (PDF)'}
              </span>
            </Button>
            <Link to='/dashboard/admin/commissions/rules'>
              <Button className='text-xs font-bold gap-1.5 shadow-2xs h-8.5'>
                <Settings className='size-3.5' />
                <span>{language === 'vi' ? 'Cấu hình quy tắc phí' : 'Configure Fee Rules'}</span>
                <ArrowRight className='size-3.5' />
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. Active Fee Structure Tiles (Bento Hero Cards) */}
        <CommissionKpiCards />

        {/* 2. Historical Fee Impact Summary & Schedule (7:5 Split) */}
        <div className='grid grid-cols-12 gap-5'>
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
