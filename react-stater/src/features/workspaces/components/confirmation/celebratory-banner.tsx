import { useState } from 'react';
import { CheckCircle2, Copy, Check, Clock } from 'lucide-react';

interface CelebratoryBannerProps {
  orderRef?: string;
  email?: string;
  paymentMethod?: string;
  dateStr?: string;
  status?: string;
}

export function CelebratoryBanner({
  orderRef = 'NX-8821',
  email = 'customer@nexspace.io',
  paymentMethod = 'Paid via PayOS (VietQR)',
  dateStr = 'Today',
  status = 'CONFIRMED'
}: CelebratoryBannerProps) {
  const [copied, setCopied] = useState(false);

  const cleanOrderRef = orderRef.replace('#', '');

  const handleCopyOrder = () => {
    navigator.clipboard?.writeText(cleanOrderRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHold = status === 'PENDING_PAYMENT';
  const isApproval = status === 'PENDING_APPROVAL';

  return (
    <div className='flex flex-col items-center text-center mb-6'>
      {/* Animated Icon */}
      {isHold ? (
        <div className='relative mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]'>
          <Clock className='h-8 w-8' />
          <span className='absolute inset-0 rounded-full animate-ping opacity-25 bg-amber-400' />
        </div>
      ) : (
        <div className='relative mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]'>
          <CheckCircle2 className='h-8 w-8' />
          <span className='absolute inset-0 rounded-full animate-ping opacity-25 bg-emerald-400' />
        </div>
      )}

      <h1 className='text-foreground font-sans text-2xl sm:text-3xl font-bold tracking-tight'>
        {isHold ? 'Seat Held & Pass Issued!' : isApproval ? 'Booking Request Submitted!' : 'Booking Confirmed!'}
      </h1>

      <p className='text-muted-foreground mt-1.5 max-w-[460px] text-xs sm:text-sm leading-relaxed'>
        {isHold
          ? 'Your 15-minute seat reservation is active. Digital access pass is ready for check-in upon payment.'
          : `Your digital access pass has been generated. Confirmation receipt sent to `}
        <span className='text-foreground underline decoration-primary/40 underline-offset-2 font-medium'>
          {email}
        </span>
      </p>

      {/* Meta Receipt Strip */}
      <div className='bg-muted/60 border-border/80 text-muted-foreground mt-3.5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border px-3.5 py-1 text-xs'>
        <button
          type='button'
          onClick={handleCopyOrder}
          className='text-foreground hover:text-primary flex cursor-pointer items-center gap-1 font-mono font-semibold transition-colors active:scale-95'
          title='Copy order reference'
        >
          <span>Order #{cleanOrderRef}</span>
          {copied ? (
            <Check className='h-3 w-3 text-emerald-600' />
          ) : (
            <Copy className='text-muted-foreground h-3 w-3' />
          )}
        </button>
        <span className='text-border-interactive'>•</span>
        <span>{paymentMethod}</span>
        <span className='text-border-interactive'>•</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
