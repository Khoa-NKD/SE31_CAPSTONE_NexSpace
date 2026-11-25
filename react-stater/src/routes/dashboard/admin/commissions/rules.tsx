import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ShieldCheck,
  Percent,
  CalendarCheck,
  Terminal
} from '@/components/ui/hugeicons';
import { CommissionImmutabilityBanner } from '@/features/admin-commissions/components/commission-immutability-banner';
import { CommissionRulesTable } from '@/features/admin-commissions/components/commission-rules-table';
import { CommissionRuleDrawer } from '@/features/admin-commissions/components/commission-rule-drawer';
import {
  MOCK_COMMISSION_RULES,
  CommissionRule
} from '@/features/admin-commissions/data/mock-commissions';
import { useLanguage } from '@/features/landing/context/language-context';

export const Route = createFileRoute('/dashboard/admin/commissions/rules')({
  head: () => ({
    meta: [
      { title: 'A14 — Commission Configuration & Rule Details | NexSpace Admin Console' },
      {
        name: 'description',
        content: 'Configure platform fee parameters and inspect immutable ledger policies.'
      }
    ]
  }),
  component: CommissionRulesConfigurationPage
});

function CommissionRulesConfigurationPage() {
  const { language } = useLanguage();
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(
    MOCK_COMMISSION_RULES[0]
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rules, setRules] = useState<CommissionRule[]>(MOCK_COMMISSION_RULES);

  function handleSelectRule(rule: CommissionRule) {
    setSelectedRule(rule);
    setIsDrawerOpen(true);
  }

  function handleCreateNewRule() {
    const newRuleTemplate: CommissionRule = {
      id: `rule-${Date.now()}`,
      ruleCode: `NX_COMM_NEW_${Math.floor(Math.random() * 90 + 10)}`,
      name: 'Custom Promotional Hub Fee',
      nameVi: 'Biểu phí Ưu đãi Hub Không gian Mới',
      subtitle: 'Draft promotional campaign rule',
      subtitleVi: 'Quy tắc chiến dịch khuyến mãi mới',
      scope: 'Selected Regional Flagship Hubs',
      scopeVi: 'Các Không gian Trọng điểm Khu vực',
      scopeType: 'marketplace',
      effectiveRate: 10.0,
      effectiveFrom: language === 'vi' ? 'Chu kỳ thanh toán tiếp theo' : 'Next Billing Cycle',
      effectiveTo: language === 'vi' ? 'Vô thời hạn' : 'Indefinite',
      status: 'ACTIVE',
      description: 'Promotional onboarding discount for new verified space partners.',
      descriptionVi: 'Chính sách ưu đãi gia nhập cho đối tác chủ không gian mới được xác thực.',
      applicableSpaces: 'Participating Co-working & Meeting Rooms',
      applicableSpacesVi: 'Bàn làm việc & Phòng họp tham gia chương trình',
      calculationType: 'PERCENTAGE',
      version: 'v2.4.2'
    };
    setSelectedRule(newRuleTemplate);
    setIsDrawerOpen(true);
  }

  function handleRuleUpdated(updatedRule: CommissionRule) {
    setRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
    setSelectedRule(updatedRule);
  }

  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-10'>
        {/* Top Breadcrumb & HSM Notice */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between text-xs pb-1 gap-2'>
          <div className='flex items-center gap-1.5 text-muted-foreground font-medium'>
            <span>{language === 'vi' ? 'Vận hành hệ thống' : 'Platform Ops'}</span>
            <span>/</span>
            <span>{language === 'vi' ? 'Thương mại & Sổ cái' : 'Commercial & Ledger'}</span>
            <span>/</span>
            <span className='text-foreground font-semibold'>
              {language === 'vi' ? 'Cấu hình Biểu phí' : 'Fee Configuration'}
            </span>
          </div>
          <div className='flex items-center gap-1.5 text-muted-foreground font-mono text-[11px] self-start sm:self-auto bg-muted/40 px-2.5 py-1 rounded-md border border-border/60'>
            <ShieldCheck className='size-3.5 text-emerald-600 dark:text-emerald-400' />
            <span>HSM Guardrail v4.1 Active</span>
          </div>
        </div>

        {/* Page Title & Action */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading'>
              {language === 'vi'
                ? 'Cấu hình Quy tắc Phí & Hoa hồng'
                : 'Commission Rules Configuration'}
            </h1>
            <p className='text-xs text-muted-foreground mt-1'>
              {language === 'vi'
                ? 'Thiết lập các thông số hoa hồng sàn. Lưu ý: Mọi cập nhật chỉ áp dụng cho các giao dịch mới phát sinh.'
                : 'Define platform fees. Note: Fee updates apply strictly to future transactions.'}
            </p>
          </div>
          <Button
            onClick={handleCreateNewRule}
            className='text-xs font-bold gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto h-8.5'
          >
            <Plus className='size-4' />
            <span>{language === 'vi' ? 'Tạo quy tắc phí mới' : 'Create New Fee Rule'}</span>
          </Button>
        </div>

        {/* 1. Legal Compliance & Ledger Immutability Warning Banner */}
        <CommissionImmutabilityBanner />

        {/* 2. Summary KPI Counter Tiles (Bento Row) */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='bg-card text-card-foreground border border-border/70 p-4 rounded-xl shadow-2xs flex flex-col justify-between hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono'>
                {language === 'vi' ? 'Quy tắc hiệu lực' : 'Active Rules'}
              </span>
              <div className='size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center'>
                <Percent className='size-3.5' />
              </div>
            </div>
            <div className='flex items-baseline justify-between mt-3'>
              <span className='text-2xl font-extrabold text-foreground font-heading'>
                {rules.length}
              </span>
              <span className='inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20'>
                <span className='size-1.5 rounded-full bg-emerald-500' />
                {language === 'vi' ? 'Đã kiểm định' : 'All Validated'}
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border/70 p-4 rounded-xl shadow-2xs flex flex-col justify-between hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono'>
                {language === 'vi' ? 'Tỷ lệ sàn trung bình' : 'Avg Marketplace Rate'}
              </span>
              <div className='size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center'>
                <Percent className='size-3.5' />
              </div>
            </div>
            <div className='flex items-baseline justify-between mt-3'>
              <span className='text-2xl font-extrabold text-foreground font-heading'>
                12.0%
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>
                {language === 'vi' ? 'Bàn làm việc' : 'Standard Desk'}
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border/70 p-4 rounded-xl shadow-2xs flex flex-col justify-between hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono'>
                {language === 'vi' ? 'Điều chỉnh chờ xử lý' : 'Scheduled Adjustments'}
              </span>
              <div className='size-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center'>
                <CalendarCheck className='size-3.5' />
              </div>
            </div>
            <div className='flex items-baseline justify-between mt-3'>
              <span className='text-2xl font-extrabold text-foreground font-heading'>
                0
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>
                {language === 'vi' ? 'Không có tồn đọng' : 'Pending Triage'}
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border/70 p-4 rounded-xl shadow-2xs flex flex-col justify-between hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono'>
                {language === 'vi' ? 'Phiên bản sổ cái' : 'Audited Ledger Version'}
              </span>
              <div className='size-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center'>
                <Terminal className='size-3.5' />
              </div>
            </div>
            <div className='flex items-baseline justify-between mt-3'>
              <span className='text-2xl font-extrabold text-foreground font-mono font-heading'>
                v2.4.1
              </span>
              <span className='text-[11px] text-primary font-mono font-semibold'>
                Immutable Hash
              </span>
            </div>
          </div>
        </div>

        {/* 3. Master Rules Table with Configuration Mode */}
        <CommissionRulesTable
          isConfigurationMode
          selectedRuleId={selectedRule?.id}
          onSelectRule={handleSelectRule}
        />
      </div>

      {/* Slide-over Configuration Drawer */}
      <CommissionRuleDrawer
        rule={selectedRule}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRuleUpdated={handleRuleUpdated}
      />
    </PageContainer>
  );
}
