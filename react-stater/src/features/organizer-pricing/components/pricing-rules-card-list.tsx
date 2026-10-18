import React from 'react';
import {
  SlidersHorizontal,
  Laptop,
  Users,
  Presentation,
  PhoneCall,
  Clock,
  SunMedium,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PricingTierRule } from '../types';

interface PricingRulesCardListProps {
  rules: PricingTierRule[];
  onSelectRule: (rule: PricingTierRule) => void;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'HOT_DESK':
      return <Laptop className="w-4 h-4 text-blue-500" />;
    case 'DEDICATED_DESK':
      return <Users className="w-4 h-4 text-indigo-500" />;
    case 'MEETING_ROOM':
      return <Presentation className="w-4 h-4 text-amber-500" />;
    case 'BOOTH':
      return <PhoneCall className="w-4 h-4 text-emerald-500" />;
    default:
      return <Laptop className="w-4 h-4 text-muted-foreground" />;
  }
}

export function PricingRulesCardList({
  rules,
  onSelectRule
}: PricingRulesCardListProps) {

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active Tier Rules & Formulas
          </h2>
          <Badge variant="secondary" className="text-xs font-mono">
            {rules.length} Tiers
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Auto-synchronized with floorplan inventory
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className="border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 shadow-xs flex flex-col justify-between group"
          >
            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                {/* Category & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-muted/70 flex items-center justify-center">
                      {getCategoryIcon(rule.targetCategory)}
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {rule.targetCategoryLabel}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Active</span>
                  </Badge>
                </div>

                {/* Rule Title */}
                <h3 className="text-sm font-semibold text-foreground mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {rule.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applies to {rule.targetCount} resources on Floor 12
                </p>

                {/* Rates 3-column pill */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/60 mt-3 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Hourly</span>
                    <span className="text-xs font-bold font-mono text-foreground">
                      ${rule.hourlyRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-x border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Daily (8h)</span>
                    <span className="text-xs font-bold font-mono text-foreground">
                      ${rule.dailyRate.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Monthly</span>
                    <span className="text-xs font-bold font-mono text-foreground">
                      ${rule.monthlyRate.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Rules & Surcharges Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-border/60">
                  {rule.durationDiscountEnabled ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 gap-1 px-1.5 py-0.5"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        -{rule.durationDiscountPercent}% for ≥{rule.durationThresholdHours}h
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                      No Duration Discount
                    </Badge>
                  )}

                  {rule.weekendSurchargeEnabled && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 gap-1 px-1.5 py-0.5"
                    >
                      <SunMedium className="w-2.5 h-2.5" />
                      <span>+${rule.weekendSurchargePerHour.toFixed(2)}/h Wknd</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectRule(rule)}
                className="w-full h-8 text-xs font-medium gap-1.5 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all mt-2"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configure Rate Matrix</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
