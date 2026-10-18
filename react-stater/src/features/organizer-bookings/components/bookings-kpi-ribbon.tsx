import React from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Ban,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BookingsKpiSummary } from '../types';

interface BookingsKpiRibbonProps {
  kpis: BookingsKpiSummary;
}

export function BookingsKpiRibbon({ kpis }: BookingsKpiRibbonProps) {
  const cards = [
    {
      label: 'Total Reservations (Jan 2026)',
      value: kpis.totalReservations,
      badgeText: `+${kpis.growthMoM}% MoM`,
      badgeClass:
        'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      hasTrendIcon: true,
      subtext: 'Across 3 zones • 42 physical units',
      icon: <CalendarCheck className="w-4 h-4 text-primary" />,
      iconBoxClass: 'bg-primary/10 text-primary'
    },
    {
      label: 'Confirmed & Paid',
      value: kpis.confirmedCount,
      badgeText: `$${kpis.confirmedVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} vol`,
      badgeClass:
        'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-mono',
      hasTrendIcon: false,
      subtext: '90.1% settled via PayOS gateway',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      iconBoxClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      label: 'Pending Payment (10-min hold)',
      value: kpis.pendingCount,
      badgeText: `$${kpis.pendingVolume.toFixed(2)} pending`,
      badgeClass:
        'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 font-mono',
      hasTrendIcon: false,
      subtext: 'Awaiting customer PayOS checkout',
      hasPulseDot: true,
      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      iconBoxClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    },
    {
      label: 'Cancelled / Refunded',
      value: kpis.cancelledCount,
      badgeText: `Rate: ${kpis.cancellationRatePercent}%`,
      badgeClass: 'text-muted-foreground bg-muted border-border',
      hasTrendIcon: false,
      subtext: '7 auto-expired • 3 user cancelled',
      icon: <Ban className="w-4 h-4 text-rose-500" />,
      iconBoxClass: 'bg-rose-500/10 text-rose-500'
    }
  ];

  return (
    <section aria-label="Bookings KPI Ribbon" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className="border border-border/80 bg-card hover:border-border transition-all duration-200 shadow-2xs hover:shadow-xs"
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {c.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconBoxClass}`}
              >
                {c.icon}
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 pt-1">
              <span className="text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {c.value}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.badgeClass}`}
              >
                {c.hasTrendIcon && <TrendingUp className="w-3 h-3" />}
                {c.badgeText}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              {c.hasPulseDot && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              )}
              <span className="truncate">{c.subtext}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

