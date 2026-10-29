import React from 'react';
import { Shield, Star, CheckCircle2, Sparkles, Settings } from 'lucide-react';
import { QualityHealthMetrics } from '../data/mock-workspaces';

interface QualityComplianceCardProps {
  metrics: QualityHealthMetrics;
}

export function QualityComplianceCard({ metrics }: QualityComplianceCardProps) {
  return (
    <div className='bg-card p-6 rounded-xl border border-border shadow-2xs flex flex-col justify-between'>
      <div>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-lg bg-primary/10 text-primary'>
              <Shield className='size-5' aria-hidden='true' />
            </div>
            <h2 className='text-base font-bold font-heading text-foreground'>
              Quality &amp; Operational Health
            </h2>
          </div>
          <span className='px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'>
            {metrics.gradeBadge}
          </span>
        </div>

        <p className='text-xs text-muted-foreground mb-5'>
          Platform quality and operational health telemetry indicators. Live metrics activate upon guest review and field audit telemetry integration.
        </p>

        {/* Metrics Triple Tiles */}
        <div className='grid grid-cols-3 gap-3 mb-5'>
          {/* Score 1 */}
          <div className='p-3.5 rounded-lg bg-muted/50 border border-border'>
            <span className='text-xs text-muted-foreground block mb-1'>Nomad Rating</span>
            <div className='flex items-center gap-1.5'>
              <span className='text-xl font-bold font-heading text-foreground'>{metrics.nomadRating}</span>
              {typeof metrics.nomadRating === 'number' ? (
                <Star className='size-4 fill-amber-400 text-amber-400' aria-hidden='true' />
              ) : (
                <Star className='size-4 text-muted-foreground/40' aria-hidden='true' />
              )}
            </div>
            <span className='text-[10px] text-muted-foreground mt-1 block'>{metrics.totalRatingsCount}</span>
          </div>

          {/* Score 2 */}
          <div className='p-3.5 rounded-lg bg-muted/50 border border-border'>
            <span className='text-xs text-muted-foreground block mb-1'>Hygiene Flags</span>
            <div className='flex items-center gap-1.5'>
              <span className={`text-xl font-bold font-heading ${typeof metrics.hygieneFlags === 'number' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {metrics.hygieneFlags}
              </span>
              <CheckCircle2 className={`size-4 ${typeof metrics.hygieneFlags === 'number' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'}`} aria-hidden='true' />
            </div>
            <span className='text-[10px] text-muted-foreground mt-1 block'>{metrics.hygieneCleanPeriod}</span>
          </div>

          {/* Score 3 */}
          <div className='p-3.5 rounded-lg bg-muted/50 border border-border'>
            <span className='text-xs text-muted-foreground block mb-1'>Audit Benchmark</span>
            <div className='flex items-center gap-1'>
              <span className='text-sm font-semibold font-mono text-muted-foreground'>Not Available</span>
            </div>
            <span className='text-[10px] text-muted-foreground mt-1 block'>Audit telemetry unavailable</span>
          </div>
        </div>

        {/* Insight Callout */}
        <div className='p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3'>
          <Sparkles className='size-5 text-primary shrink-0' aria-hidden='true' />
          <p className='text-xs text-foreground leading-relaxed'>
            All submitted workspace media and floor plans are reviewed prior to marketplace indexing.
          </p>
        </div>
      </div>

      {/* Footer Telemetry Link */}
      <div className='pt-4 border-t border-border flex items-center justify-between'>
        <span className='font-mono text-xs text-muted-foreground'>
          Standards Engine: <strong className='text-foreground font-semibold'>{metrics.standardsEngineNote}</strong>
        </span>
        <button
          type='button'
          disabled
          className='inline-flex items-center gap-1 text-xs text-muted-foreground/60 cursor-not-allowed font-semibold'
          title='Guidelines preview not connected'
        >
          <span>Review Guidelines</span>
          <Settings className='size-3.5' aria-hidden='true' />
        </button>
      </div>
    </div>
  );
}
