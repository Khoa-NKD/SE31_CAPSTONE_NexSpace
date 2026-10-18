import React from 'react';
import {
  Clock,
  TrendingUp,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleKpiSummary } from '../types';

interface ScheduleKpiRibbonProps {
  kpis: ScheduleKpiSummary;
}

export function ScheduleKpiRibbon({ kpis }: ScheduleKpiRibbonProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 select-none">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Resource Schedule & Gantt Timeline
        </h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
          Interactive real-time schedule audit, booking allocation, and maintenance blocks across all floor resources.
        </p>
      </div>

      {/* 4 Ribbon Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 self-stretch xl:self-auto">
        {/* Metric 1: Booked Hours */}
        <Card className="bg-card border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Booked Hours</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 mt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground font-mono">{kpis.bookedHours}</span>
                <span className="text-xs text-muted-foreground font-medium">hrs</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-1.5 py-0">
                +{kpis.bookedHoursGrowth}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Peak Window */}
        <Card className="bg-card border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Peak Window</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-foreground font-mono truncate">{kpis.peakWindow}</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-1.5 py-0">
                {kpis.peakOccupancyPercent}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Turnstile In */}
        <Card className="bg-card border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Turnstile In</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xl font-bold text-foreground font-mono">
                {kpis.turnstileCurrent} <span className="text-xs font-normal text-muted-foreground">/ {kpis.turnstileTotal}</span>
              </span>
              <span className="relative flex h-2 w-2 mb-1" title="IoT Turnstiles Active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Maintenance Blocks */}
        <Card className="bg-card border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Maintenance</span>
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xl font-bold text-foreground font-mono">
                {kpis.maintenanceBlocksCount} <span className="text-xs font-normal text-muted-foreground">blocks</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Downtime</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

