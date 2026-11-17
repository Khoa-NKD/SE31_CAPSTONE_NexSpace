import React from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PhoneCall,
  TrendingDown,
  CreditCard
} from 'lucide-react';
import { ReportsKpis } from '../data/mock-reports-overview';

interface ReportsKpiGridProps {
  kpis: ReportsKpis;
}

export function ReportsKpiGrid({ kpis }: ReportsKpiGridProps) {
  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8'>
      {/* Card 1: Open Cases Workload */}
      <div className='bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Open Cases Workload
          </span>
          <div className='size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20'>
            <Inbox className='size-4' />
          </div>
        </div>
        <div>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.openCasesCount} Unresolved
          </div>
          <div className='flex items-center gap-2 mt-2'>
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold'>
              <span className='size-1.5 rounded-full bg-amber-500' />
              {kpis.pendingTriageCount} Pending Triage
            </span>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-3 pt-3 border-t border-border flex items-center gap-1.5'>
          <Clock className='size-3.5 text-muted-foreground' />
          Oldest case logged 2.8 hours ago
        </p>
      </div>

      {/* Card 2: High Priority Escalations */}
      <div className='bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            High Priority Escalations
          </span>
          <div className='size-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20'>
            <AlertTriangle className='size-4' />
          </div>
        </div>
        <div>
          <div className='text-[28px] font-bold text-red-600 dark:text-red-400 tracking-tight'>
            {kpis.urgentEscalationsCount} Urgent
          </div>
          <div className='flex items-center gap-2 mt-2'>
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 text-[11px] font-semibold'>
              <span className='size-1.5 rounded-full bg-red-500' />
              Facility & Safety
            </span>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-3 pt-3 border-t border-border flex items-center gap-1.5'>
          <PhoneCall className='size-3.5 text-muted-foreground' />
          Requires immediate partner contact
        </p>
      </div>

      {/* Card 3: Average Resolution Time */}
      <div className='bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Average Resolution Time
          </span>
          <div className='size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20'>
            <Clock className='size-4' />
          </div>
        </div>
        <div>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.avgResolutionHours} Hours
          </div>
          <div className='flex items-center gap-2 mt-2'>
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold'>
              <span className='size-1.5 rounded-full bg-emerald-500' />
              Target &lt; 6h (Within SLA)
            </span>
          </div>
        </div>
        <p className='text-xs text-emerald-600 dark:text-emerald-400 mt-3 pt-3 border-t border-border flex items-center gap-1.5'>
          <TrendingDown className='size-3.5' />
          Down 18% vs previous 30 days
        </p>
      </div>

      {/* Card 4: Resolved Cases (30d) */}
      <div className='bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Resolved Cases (30d)
          </span>
          <div className='size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20'>
            <CheckCircle2 className='size-4' />
          </div>
        </div>
        <div>
          <div className='text-[28px] font-bold text-foreground tracking-tight'>
            {kpis.resolvedCasesCount} Cases
          </div>
          <div className='flex items-center gap-2 mt-2'>
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold'>
              <span className='size-1.5 rounded-full bg-emerald-500' />
              {kpis.satisfactionRate}% Satisfied
            </span>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-3 pt-3 border-t border-border flex items-center gap-1.5'>
          <CreditCard className='size-3.5 text-muted-foreground' />
          ${kpis.restoredGoodwillUsd.toLocaleString()} restored in goodwill
        </p>
      </div>
    </section>
  );
}
