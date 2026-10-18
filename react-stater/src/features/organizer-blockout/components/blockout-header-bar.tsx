import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronRight,
  CalendarX2,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { BlockoutMetrics } from '../types';

interface BlockoutHeaderBarProps {
  metrics: BlockoutMetrics;
}

export function BlockoutHeaderBar({ metrics }: BlockoutHeaderBarProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
        <Link to="/dashboard/organizer/workspaces" className="hover:text-foreground transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span>District 1, HCMC</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-muted-foreground">NexSpace Saigon Prime Hub</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Blockout Hours</span>
      </nav>

      {/* Main Header & Metrics Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Unavailability & Blockout Hours
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Manage operational downtime, HVAC maintenance, and private enterprise reserve schedules
            to prevent booking conflicts across your spaces.
          </p>
        </div>

        {/* Metric Indicator Pills (Data Density Bento Flow) */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Active Blocks */}
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <CalendarX2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active Blocks
              </p>
              <p className="text-sm font-bold text-foreground">
                {metrics.activeBlocksCount} Blocks{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({metrics.activeBlocksHours}h)
                </span>
              </p>
            </div>
          </div>

          {/* Next Blockout */}
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Next Blockout
              </p>
              <p className="text-sm font-bold text-foreground">
                {metrics.nextBlockoutDate}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({metrics.nextBlockoutReason})
                </span>
              </p>
            </div>
          </div>

          {/* Bookable Availability */}
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Availability
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.availabilityUptimePercent}%{' '}
                <span className="text-xs font-normal text-muted-foreground">uptime</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

