import React from 'react';
import {
  DollarSign,
  Clock,
  Percent,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PricingKpiSummary } from '../types';

interface PricingKpiGridProps {
  kpis: PricingKpiSummary;
}

export function PricingKpiGrid({ kpis }: PricingKpiGridProps) {
  const cards = [
    {
      label: 'Average Rate / Hr',
      value: `$${kpis.avgHourlyRate.toFixed(2)}`,
      trend: `↑ ${kpis.avgHourlyGrowth}%`,
      trendPositive: true,
      subtext: 'vs last month',
      icon: <DollarSign className="w-4 h-4 text-primary" />
    },
    {
      label: 'Weekly Bookings',
      value: `${kpis.weeklyBookingsHours} hrs`,
      trend: '+18.5%',
      trendPositive: true,
      subtext: 'across active spaces',
      icon: <Clock className="w-4 h-4 text-blue-500" />
    },
    {
      label: 'Active Discount Rule',
      value: kpis.activeDiscountRuleLabel,
      trend: 'Volume Auto',
      trendPositive: true,
      subtext: 'Duration scaling active',
      icon: <Percent className="w-4 h-4 text-indigo-500" />
    },
    {
      label: 'Occupancy Forecast',
      value: `${kpis.occupancyForecastPercent}%`,
      trend: 'Optimal',
      trendPositive: true,
      subtext: 'revenue sweet spot',
      icon: <BarChart3 className="w-4 h-4 text-emerald-500" />
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="border border-border/80 bg-card hover:border-border transition-all duration-200 shadow-xs hover:shadow-sm"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 pt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3" />
                {card.trend}
              </span>
            </div>

            <p className="text-xs text-muted-foreground truncate">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

