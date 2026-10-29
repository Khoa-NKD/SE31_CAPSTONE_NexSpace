import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  PricingTierRule,
  PricingResourceRow,
  PricingKpiSummary
} from '../types';
import {
  INITIAL_PRICING_KPIS,
  INITIAL_PRICING_RULES,
  MOCK_PRICING_RESOURCES
} from '../data/mock-pricing';
import { PricingHeaderBar } from './pricing-header-bar';
import { PricingKpiGrid } from './pricing-kpi-grid';
import { PricingRulesCardList } from './pricing-rules-card-list';
import { PricingMatrixTable } from './pricing-matrix-table';
import { PricingMatrixDialog } from './pricing-matrix-dialog';

function handleExportMatrix() {
  toast.success('Pricing Matrix export ready', {
    description: 'Downloaded pricing-matrix-floor12.csv for marketplace audit.'
  });
}

export function PricingMatrixView() {
  const [kpis, setKpis] = useState<PricingKpiSummary>(INITIAL_PRICING_KPIS);
  const [rules, setRules] = useState<PricingTierRule[]>(INITIAL_PRICING_RULES);
  const [resources, setResources] = useState<PricingResourceRow[]>(MOCK_PRICING_RESOURCES);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingTierRule | null>(null);

  // Open dialog for new / general rule
  const handleOpenConfigDialog = () => {
    setEditingRule(rules[0] || null);
    setDialogOpen(true);
  };

  // Open dialog for a specific rule from cards
  const handleSelectRule = (rule: PricingTierRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  // Open dialog for a specific resource node from table
  const handleConfigureResource = (resource: PricingResourceRow) => {
    const existingRule = rules.find((r) => r.targetCategory === resource.category);
    const customRule: PricingTierRule = {
      id: `custom-${resource.id}`,
      name: `Custom Overwrite: ${resource.code}`,
      scope: 'SPECIFIC_RESOURCE',
      targetCategory: resource.category,
      targetCategoryLabel: resource.categoryLabel,
      targetCount: 1,
      targetResourceId: resource.id,
      targetResourceCode: resource.code,
      hourlyRate: resource.baseHourly,
      dailyRate: resource.dailyPass,
      monthlyRate: resource.monthlyPass,
      minBookingHours: existingRule?.minBookingHours ?? 1,
      durationDiscountEnabled: existingRule?.durationDiscountEnabled ?? true,
      durationThresholdHours: existingRule?.durationThresholdHours ?? 5,
      durationDiscountPercent: existingRule?.durationDiscountPercent ?? 15,
      weekendSurchargeEnabled: existingRule?.weekendSurchargeEnabled ?? false,
      weekendSurchargePerHour: existingRule?.weekendSurchargePerHour ?? 0.5,
      status: 'ACTIVE',
      updatedAt: 'Just now'
    };
    setEditingRule(customRule);
    setDialogOpen(true);
  };

  // Save rule from dialog
  const handleSaveRule = (saved: PricingTierRule) => {
    if (saved.scope === 'SPECIFIC_RESOURCE' && saved.targetResourceCode) {
      // Update the specific resource row
      setResources((prev) =>
        prev.map((res) => {
          if (res.code === saved.targetResourceCode) {
            return {
              ...res,
              baseHourly: saved.hourlyRate,
              dailyPass: saved.dailyRate,
              monthlyPass: saved.monthlyRate,
              hasCustomOverwrite: true,
              appliedRuleName: saved.name
            };
          }
          return res;
        })
      );
      toast.success(`Custom pricing saved for ${saved.targetResourceCode}`);
    } else {
      // Update tier rule
      setRules((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        if (exists) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [...prev, saved];
      });

      // Update all matching non-overwritten resources
      setResources((prev) =>
        prev.map((res) => {
          if (res.category === saved.targetCategory && !res.hasCustomOverwrite) {
            return {
              ...res,
              baseHourly: saved.hourlyRate,
              dailyPass: saved.dailyRate,
              monthlyPass: saved.monthlyRate,
              appliedRuleName: saved.name
            };
          }
          return res;
        })
      );

      // Re-calculate KPI average rate
      setKpis((prev) => {
        const totalRates = resources.reduce((acc, r) => acc + r.baseHourly, 0);
        const avg = resources.length > 0 ? totalRates / resources.length : prev.avgHourlyRate;
        return {
          ...prev,
          avgHourlyRate: Number(avg.toFixed(2))
        };
      });

      toast.success(`Pricing rules applied to ${saved.targetCategoryLabel}`);
    }
  };

  // Reset resource back to standard tier
  const handleResetResource = (resourceId: string) => {
    const res = resources.find((r) => r.id === resourceId);
    if (!res) return;

    const parentTier = rules.find((r) => r.targetCategory === res.category) || rules[0];
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              baseHourly: parentTier.hourlyRate,
              dailyPass: parentTier.dailyRate,
              monthlyPass: parentTier.monthlyRate,
              hasCustomOverwrite: false,
              appliedRuleName: parentTier.name
            }
          : r
      )
    );
    toast.info(`Reset ${res.code} to ${parentTier.name}`);
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Bar with Breadcrumb and Actions */}
      <PricingHeaderBar
        onOpenConfigDialog={handleOpenConfigDialog}
        onExportMatrix={handleExportMatrix}
      />

      {/* 2. KPI Metrics Grid */}
      <PricingKpiGrid kpis={kpis} />

      {/* 3. Active Tier Rules Grid */}
      <PricingRulesCardList rules={rules} onSelectRule={handleSelectRule} />

      {/* 4. Detailed Pricing Matrix Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Inventory Rate Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              Individual unit overrides and live marketplace effective prices
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {resources.length} active resources
          </span>
        </div>

        <PricingMatrixTable
          resources={resources}
          onConfigureResource={handleConfigureResource}
          onResetResource={handleResetResource}
        />
      </div>

      {/* 5. Rich Pricing Matrix Modal Dialog */}
      <PricingMatrixDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialRule={editingRule}
        onSaveRule={handleSaveRule}
      />
    </div>
  );
}
