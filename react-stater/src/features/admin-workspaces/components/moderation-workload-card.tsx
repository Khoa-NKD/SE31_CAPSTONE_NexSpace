import React from 'react';
import { Link } from '@tanstack/react-router';
import { ClipboardCheck, Building2, DraftingCompass, CheckCircle2, ArrowRight } from 'lucide-react';
import { ModerationWorkloadItem } from '../data/mock-workspaces';

interface ModerationWorkloadCardProps {
  items: ModerationWorkloadItem[];
  awaitingCount: number;
  averageTurnaroundHours: number;
}

export function ModerationWorkloadCard({
  items,
  awaitingCount,
  averageTurnaroundHours
}: ModerationWorkloadCardProps) {
  return (
    <div className='bg-card p-6 rounded-xl border border-border shadow-2xs flex flex-col justify-between'>
      <div>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-lg bg-primary/10 text-primary'>
              <ClipboardCheck className='size-5' aria-hidden='true' />
            </div>
            <h2 className='text-base font-bold font-heading text-foreground'>
              Pending Moderation Workload
            </h2>
          </div>
          <span className='px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'>
            {awaitingCount} Awaiting Decision
          </span>
        </div>

        <p className='text-xs text-muted-foreground mb-5'>
          Spaces queued for physical or legal verification prior to search engine indexing and checkout activation.
        </p>

        {/* Categorized Inspection Items */}
        <div className='space-y-3 mb-5'>
          {items.map((item) => (
            <div
              key={item.id}
              className='p-3.5 rounded-lg bg-muted/50 border border-border flex items-start justify-between gap-3'
            >
              <div className='flex items-start gap-3'>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${item.iconBgClass} ${item.iconColorClass}`}>
                  {item.icon === 'add_business' ? (
                    <Building2 className='size-4' aria-hidden='true' />
                  ) : (
                    <DraftingCompass className='size-4' aria-hidden='true' />
                  )}
                </div>
                <div>
                  <h3 className='text-xs font-bold text-foreground'>{item.title}</h3>
                  <p className='text-xs text-muted-foreground mt-0.5'>{item.description}</p>
                </div>
              </div>
              <span className='font-mono text-[11px] font-semibold text-foreground bg-card px-2 py-0.5 rounded border border-border shrink-0'>
                {item.priorityLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Action & SLA Telemetry */}
      <div className='pt-4 border-t border-border flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <CheckCircle2 className='size-4 text-emerald-600 dark:text-emerald-400' aria-hidden='true' />
          <span className='font-mono text-xs text-muted-foreground'>
            Avg Turnaround: <strong className='text-foreground font-semibold'>{averageTurnaroundHours}h</strong> (100% within SLA)
          </span>
        </div>
        <Link
          to='/dashboard/admin/workspaces'
          search={{ filter: 'pending' }}
          className='inline-flex items-center gap-1.5 text-xs text-primary hover:text-indigo-700 transition-colors font-semibold'
        >
          <span>Review Pending Queue</span>
          <ArrowRight className='size-3.5' aria-hidden='true' />
        </Link>
      </div>
    </div>
  );
}
