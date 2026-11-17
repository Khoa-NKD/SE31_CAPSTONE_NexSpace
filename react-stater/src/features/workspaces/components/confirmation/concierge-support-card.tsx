import { Headset, PhoneCall, ShieldCheck } from 'lucide-react';

export function ConciergeSupportCard() {
  return (
    <div className='bg-card border-border/80 text-muted-foreground mt-8 w-full max-w-[540px] rounded-2xl border p-4.5 text-center text-xs shadow-xs'>
      <div className='text-foreground mb-1 flex items-center justify-center gap-1.5 font-sans text-xs sm:text-sm font-semibold'>
        <Headset className='text-primary h-4 w-4' />
        <span>On-Site Concierge &amp; Building Assistance</span>
      </div>
      <p className='text-muted-foreground text-[11px] leading-relaxed'>
        Available on Level 14 concierge desk or call{' '}
        <a
          href='tel:+842873008821'
          className='text-foreground hover:text-primary font-mono font-semibold underline decoration-border-interactive underline-offset-2 transition-colors inline-flex items-center gap-1'
        >
          <PhoneCall className='h-2.5 w-2.5 inline' />
          +84 28 7300 8821
        </a>{' '}
        • <span className='inline-flex items-center gap-1'><ShieldCheck className='h-3 w-3 text-emerald-600 inline' /> SOC-2 Type II Security Standard</span>
      </p>
    </div>
  );
}

