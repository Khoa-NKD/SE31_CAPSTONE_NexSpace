import React from 'react';
import { Gavel, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function CommissionImmutabilityBanner() {
  return (
    <aside
      aria-label='Legal Compliance & Ledger Immutability Notice'
      className='bg-amber-500/10 border border-amber-500/30 rounded-xl p-4.5 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-sm'
    >
      <div className='flex items-start gap-3.5'>
        <div className='size-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400'>
          <Gavel className='size-5' />
        </div>
        <div>
          <h2 className='text-sm font-bold text-amber-950 dark:text-amber-200'>
            Legal Compliance &amp; Ledger Immutability
          </h2>
          <p className='text-xs text-amber-900 dark:text-amber-300 mt-1 leading-relaxed'>
            Historical transactions and paid invoices are immutable and will{' '}
            <strong className='font-bold underline text-amber-950 dark:text-amber-100'>
              NEVER
            </strong>{' '}
            be recalculated when modifying commission rules. Any rate adjustment requires cryptographic HSM authorization and takes effect strictly at{' '}
            <code className='font-mono font-bold bg-amber-500/20 px-1 py-0.5 rounded text-amber-950 dark:text-amber-100'>
              T+0
            </code>{' '}
            for new checkout intents.
          </p>
        </div>
      </div>

      <div className='shrink-0 self-start sm:self-center'>
        <Badge
          variant='outline'
          className='bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 font-bold text-[11px] px-3 py-1 flex items-center gap-1.5'
        >
          <ShieldCheck className='size-3.5 text-amber-700 dark:text-amber-400' />
          SOC-2 Type II Enforced
        </Badge>
      </div>
    </aside>
  );
}
