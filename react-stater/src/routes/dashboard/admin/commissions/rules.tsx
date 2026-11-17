import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Plus, ShieldCheck } from 'lucide-react';
import { CommissionImmutabilityBanner } from '@/features/admin-commissions/components/commission-immutability-banner';
import { CommissionRulesTable } from '@/features/admin-commissions/components/commission-rules-table';
import { CommissionRuleDrawer } from '@/features/admin-commissions/components/commission-rule-drawer';
import {
  MOCK_COMMISSION_RULES,
  CommissionRule
} from '@/features/admin-commissions/data/mock-commissions';

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
      subtitle: 'Draft promotional campaign rule',
      scope: 'Selected Regional Flagship Hubs',
      scopeType: 'marketplace',
      effectiveRate: 10.0,
      effectiveFrom: 'Next Billing Cycle',
      effectiveTo: 'Indefinite',
      status: 'ACTIVE',
      description: 'Promotional onboarding discount for new verified space partners.',
      applicableSpaces: 'Participating Co-working & Meeting Rooms',
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
      <div className='flex flex-col gap-6 max-w-[1440px] mx-auto w-full'>
        {/* Top Breadcrumb & HSM Notice */}
        <div className='flex items-center justify-between text-xs pb-1'>
          <div className='flex items-center gap-1.5 text-muted-foreground font-medium'>
            <span>Platform Ops</span>
            <span>/</span>
            <span>Commercial &amp; Ledger</span>
            <span>/</span>
            <span className='text-foreground font-semibold'>Fee Configuration</span>
          </div>
          <div className='flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]'>
            <ShieldCheck className='size-3.5 text-primary' />
            <span>HSM Guardrail v4.1 Active</span>
          </div>
        </div>

        {/* Page Title & Action */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Commission Rules Configuration
            </h1>
            <p className='text-xs text-muted-foreground mt-1'>
              Define platform fees. Note: Fee updates apply strictly to future transactions.
            </p>
          </div>
          <Button
            onClick={handleCreateNewRule}
            className='text-xs font-bold gap-2 shadow-xs shrink-0 self-start sm:self-auto'
          >
            <Plus className='size-4' />
            <span>Create New Fee Rule</span>
          </Button>
        </div>

        {/* 1. Legal Compliance & Ledger Immutability Warning Banner */}
        <CommissionImmutabilityBanner />

        {/* 2. Summary KPI Counter Tiles */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='bg-card text-card-foreground border border-border p-4 rounded-xl shadow-xs flex flex-col justify-between'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              Active Rules
            </span>
            <div className='flex items-baseline justify-between mt-2'>
              <span className='text-2xl font-extrabold text-foreground'>
                {rules.length}
              </span>
              <span className='inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20'>
                <span className='size-1.5 rounded-full bg-emerald-500' />
                All Validated
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border p-4 rounded-xl shadow-xs flex flex-col justify-between'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              Avg Marketplace Rate
            </span>
            <div className='flex items-baseline justify-between mt-2'>
              <span className='text-2xl font-extrabold text-foreground'>
                12.0%
              </span>
              <span className='text-[11px] text-muted-foreground font-mono font-medium'>
                Standard Desk
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border p-4 rounded-xl shadow-xs flex flex-col justify-between'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              Scheduled Adjustments
            </span>
            <div className='flex items-baseline justify-between mt-2'>
              <span className='text-2xl font-extrabold text-foreground'>
                0
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>
                Pending Triage
              </span>
            </div>
          </div>

          <div className='bg-card text-card-foreground border border-border p-4 rounded-xl shadow-xs flex flex-col justify-between'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              Audited Ledger Version
            </span>
            <div className='flex items-baseline justify-between mt-2'>
              <span className='text-2xl font-extrabold text-foreground font-mono'>
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
