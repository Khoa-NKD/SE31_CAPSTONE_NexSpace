import React from 'react';
import { Lightbulb } from 'lucide-react';
import { DropoffIssueStat } from '../data/mock-organizers';

interface VerificationIssuesCardProps {
  issues: DropoffIssueStat[];
}

export function VerificationIssuesCard({ issues }: VerificationIssuesCardProps) {
  return (
    <div className='lg:col-span-5 bg-card rounded-xl border border-border p-6 shadow-2xs flex flex-col justify-between'>
      <div>
        <div className='pb-3 border-b border-border'>
          <h2 className='text-base font-bold font-heading text-foreground'>
            Common Verification Issues &amp; Drop-offs
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Breakdown of non-compliant rejections &amp; documentation requests over the past quarter.
          </p>
        </div>

        {/* Breakdown Progress Bars */}
        <div className='space-y-4 mt-5'>
          {issues.map((issue) => (
            <div key={issue.id} className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs font-medium'>
                <span className='text-foreground'>{issue.title}</span>
                <span className='font-semibold text-foreground'>
                  {issue.percentage}%{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({issue.casesCount} cases)
                  </span>
                </span>
              </div>
              <div className='w-full bg-muted rounded-full h-2 overflow-hidden border border-border/60'>
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    issue.id === 'blurry_license'
                      ? 'bg-rose-500'
                      : issue.id === 'mismatched_tax'
                      ? 'bg-amber-500'
                      : 'bg-slate-500 dark:bg-slate-400'
                  }`}
                  style={{ width: `${issue.percentage}%` }}
                  role='progressbar'
                  aria-valuenow={issue.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${issue.title}: ${issue.percentage}%`}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information Callout Box */}
      <div className='mt-6 bg-muted/60 border border-border rounded-lg p-3.5 flex items-start gap-3'>
        <div className='text-amber-500 shrink-0 mt-0.5'>
          <Lightbulb className='size-4' aria-hidden='true' />
        </div>
        <p className='text-xs text-muted-foreground leading-relaxed'>
          <strong className='font-semibold text-foreground'>Automated OCR pre-screening</strong> has intercepted 62% of illegible image defects before routing into the manual agent queue.
        </p>
      </div>
    </div>
  );
}
