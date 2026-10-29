import { useState } from 'react';
import { CheckCircle2, Copy, Check } from 'lucide-react';

interface CelebratoryBannerProps {
  orderRef?: string;
  email?: string;
  paymentMethod?: string;
  dateStr?: string;
}

export function CelebratoryBanner({
  orderRef = '#NX-8821',
  email = 'minh.nguyen@enterprise.tech',
  paymentMethod = 'Paid via PayOS (VietQR)',
  dateStr = 'Jan 25, 2026'
}: CelebratoryBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyOrder = () => {
    navigator.clipboard?.writeText(orderRef.replace('#', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='flex flex-col items-center text-center mb-6'>
      {/* Animated Celebratory Success Icon */}
      <div className='relative mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]'>
        <CheckCircle2 className='h-8 w-8' />
        <span className='absolute inset-0 rounded-full animate-ping opacity-25 bg-emerald-400' />
      </div>

      <h1 className='text-foreground font-sans text-2xl sm:text-3xl font-bold tracking-tight'>
        Booking Confirmed!
      </h1>

      <p className='text-muted-foreground mt-1.5 max-w-[440px] text-xs sm:text-sm leading-relaxed'>
        Your digital access pass has been generated. Confirmation receipt sent to{' '}
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
          <span>Order {orderRef}</span>
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

