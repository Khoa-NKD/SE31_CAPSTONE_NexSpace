import { ShieldCheck, History, QrCode } from 'lucide-react';

export function SeatsReassuranceBar() {
  return (
    <div className='bg-card border-border shadow-xs grid grid-cols-1 gap-4 rounded-xl border p-4 sm:p-5 md:grid-cols-3'>
      {/* Col 1: PayOS */}
      <div className='flex items-center gap-3'>
        <div className='bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
          <ShieldCheck className='h-5 w-5' />
        </div>
        <div>
          <h3 className='text-foreground text-sm font-semibold'>
            PayOS Secure Payment
          </h3>
          <p className='text-muted-foreground text-xs'>
            Encrypted 256-bit instant settlement
          </p>
        </div>
      </div>

      {/* Col 2: Free Cancellation */}
      <div className='border-border/60 flex items-center gap-3 border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4'>
        <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
          <History className='h-5 w-5' />
        </div>
        <div>
          <h3 className='text-foreground text-sm font-semibold'>
            Free Cancellation
          </h3>
          <p className='text-muted-foreground text-xs'>
            Full refund up to 1 hr before start
          </p>
        </div>
      </div>

      {/* Col 3: Instant QR Smart-Lock */}
      <div className='border-border/60 flex items-center gap-3 border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4'>
        <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
          <QrCode className='h-5 w-5' />
        </div>
        <div>
          <h3 className='text-foreground text-sm font-semibold'>
            Instant QR Smart-Lock
          </h3>
          <p className='text-muted-foreground text-xs'>
            Direct mobile turnstile &amp; door access
          </p>
        </div>
      </div>
    </div>
  );
}

