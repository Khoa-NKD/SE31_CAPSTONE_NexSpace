import { useState } from 'react';
import {
  Info,
  ArrowRight,
  Wallet,
  Lock,
  FileText,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import { PayOSCheckoutDialog } from './payos-checkout-dialog';

export function PriceBreakdownCard() {
  const { formatPrice, currency } = useCurrency();
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseRate = 10.00; // 4 hrs * $2.50
  const platformFee = 1.00;
  const vat = 0.88;
  const discountAmount = discountApplied ? 1.00 : 0;
  const totalAmountUsd = Math.max(0, baseRate + platformFee + vat - discountAmount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'NEXFIRST') {
      setDiscountApplied(true);
    }
  };

  const handleProceedPayOS = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setCheckoutOpen(true);
    }, 500);
  };

  return (
    <>
      <div className='bg-card border-border shadow-md sticky top-24 space-y-5 rounded-2xl border p-6'>
        {/* Header */}
        <div className='border-border/60 flex items-center justify-between border-b pb-4'>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Price Details
          </h2>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' />
            <span>Tier: Enterprise Plan</span>
          </div>
        </div>

        {/* Line Items */}
        <div className='border-border/60 space-y-3 border-b py-2 text-xs sm:text-sm'>
          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Base Rate (4 hrs × $2.50)
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium'>{formatPrice(baseRate)}</span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Platform Service Fee &amp; Ultra-Fast WiFi
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium'>{formatPrice(platformFee)}</span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground'>Value Added Tax (VAT 8% included)</span>
            <span className='text-muted-foreground font-medium'>{formatPrice(vat)}</span>
          </div>

          {discountApplied && (
            <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
              <span className='flex items-center gap-1.5'>
                <Tag className='h-3.5 w-3.5' />
                Promo Discount (NEXFIRST)
              </span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
        </div>

        {/* Corporate Promo Code Field */}
        <div className='border-border/60 space-y-2 border-b py-2'>
          <label htmlFor='promo-input' className='text-foreground block text-xs font-medium'>
            Corporate Promo Code
          </label>
          <div className='flex gap-2'>
            <input
              id='promo-input'
              type='text'
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder='Enter promo code (e.g. NEXFIRST)'
              className='bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 h-10 flex-grow rounded-lg border px-3 text-xs uppercase transition-colors focus:ring-1 focus:outline-none'
            />
            <button
              type='button'
              onClick={handleApplyPromo}
              className='border-border hover:bg-muted text-foreground cursor-pointer rounded-lg border px-4 text-xs font-semibold transition-all active:scale-95'
            >
              Apply
            </button>
          </div>
          {discountApplied && (
            <p className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium'>
              <CheckCircle2 className='h-3.5 w-3.5' />
              Code NEXFIRST applied successfully (-1.00 USD)
            </p>
          )}
        </div>

        {/* Total Amount Due */}
        <div className='py-1'>
          <div className='flex items-baseline justify-between'>
            <div>
              <span className='text-foreground font-sans text-base font-bold sm:text-lg'>
                Total Amount Due
              </span>
              <p className='text-muted-foreground text-xs'>
                Single charge • All local taxes included
              </p>
            </div>
            <div className='text-right'>
              <span className='text-primary font-sans text-2xl font-bold tracking-tight sm:text-3xl'>
                {formatPrice(totalAmountUsd)}
              </span>
              <span className='text-muted-foreground block text-xs font-semibold'>
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button (Proceed to PayOS Payment) */}
        <Button
          onClick={handleProceedPayOS}
          disabled={isSubmitting}
          className='group h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
        >
          {isSubmitting ? (
            <span>Connecting PayOS Gateway...</span>
          ) : (
            <>
              <span>Proceed to PayOS Payment</span>
              <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
            </>
          )}
        </Button>

        {/* Payment Security & Trust Badges */}
        <div className='border-border/60 space-y-2.5 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2.5'>
            <Wallet className='text-primary h-4 w-4 shrink-0' />
            <span>
              <strong className='text-foreground'>PayOS Instant Gateway:</strong> VietQR / Napas247 / Cards
            </span>
          </div>
          <div className='flex items-center gap-2.5'>
            <Lock className='text-emerald-600 dark:text-emerald-400 h-4 w-4 shrink-0' />
            <span>256-bit Bank Grade Encryption • SOC-2 Type II Certified</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <FileText className='text-muted-foreground h-4 w-4 shrink-0' />
            <span>Instant VAT E-Invoice sent to company email</span>
          </div>
        </div>

        {/* Reassurance pill */}
        <div className='bg-muted/70 text-muted-foreground rounded-lg p-2.5 text-center text-xs'>
          Zero booking fees for verified Enterprise Teams
        </div>
      </div>

      <PayOSCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmountUsd={totalAmountUsd}
      />
    </>
  );
}

