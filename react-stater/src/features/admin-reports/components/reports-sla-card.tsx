import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { MOCK_SLA_TIERS } from '../data/mock-reports-overview';

export function ReportsSlaCard() {
  return (
    <div className='bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm flex flex-col justify-between'>
      <div>
        <div className='flex items-center justify-between pb-4 border-b border-border mb-5'>
          <div>
            <h2 className='text-base font-bold text-foreground'>
              Resolution SLA Performance
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Target vs. realized response velocity by triage tier
            </p>
          </div>
          <span className='px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border text-xs font-semibold'>
            SOC-2 Standard
          </span>
        </div>

        {/* Tier Progress Breakdown */}
        <div className='space-y-4'>
          {MOCK_SLA_TIERS.map((tier) => (
            <div key={tier.tier}>
              <div className='flex items-center justify-between text-xs mb-1.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-foreground'>
                    {tier.tier} — {tier.title}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>(SLA: {tier.slaTarget})</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span
                    className={`font-bold ${
                      tier.statusColor === 'emerald'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : tier.statusColor === 'indigo'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {tier.compliancePercentage}% compliant
                  </span>
                  <span className='text-muted-foreground text-[11px]'>• {tier.avgRealized}</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    tier.statusColor === 'emerald'
                      ? 'bg-emerald-500'
                      : tier.statusColor === 'indigo'
                        ? 'bg-indigo-600'
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${tier.compliancePercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall SLA Scorecard Ribbon */}
      <div className='mt-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='size-5 text-emerald-600 dark:text-emerald-400' />
          <span className='font-semibold text-emerald-950 dark:text-emerald-200'>
            96.4% Overall Platform SLA Adherence
          </span>
        </div>
        <span className='font-bold text-emerald-700 dark:text-emerald-300 bg-background px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]'>
          +1.2% MoM
        </span>
      </div>
    </div>
  );
}
