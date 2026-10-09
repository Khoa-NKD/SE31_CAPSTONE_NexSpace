import { CalendarCheck } from 'lucide-react';

export function CancellationPolicyCard() {
  return (
    <div className='flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs dark:border-emerald-500/20 dark:bg-emerald-500/10'>
      <CalendarCheck className='mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400' />
      <div className='text-xs leading-relaxed text-emerald-900 dark:text-emerald-300 sm:text-sm'>
        <strong className='font-semibold text-emerald-950 dark:text-emerald-200'>
          Free cancellation &amp; 100% refund guarantee:
        </strong>{' '}
        You can cancel or reschedule this reservation up to 1 hour before scheduled start
        (until 08:00 AM, Jan 25). Instant corporate credit reversal.
      </div>
    </div>
  );
}

