import { useState } from 'react';
import {
  Info,
  ArrowRight,
  Wallet,
  Lock,
  FileText,
  CheckCircle2,
  Tag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useCalculatePriceQuery, useCreateBookingMutation, useCancelBookingMutation } from '../../api/booking-queries';
import type { BookingDto } from '../../api/booking-types';
import { PayOSCheckoutDialog } from './payos-checkout-dialog';
import { Link, useNavigate } from '@tanstack/react-router';

interface PriceBreakdownCardProps {
  workspaceId?: number;
  resourceId?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
  customerNotes?: string;
  seatCode?: string;
  workspaceName?: string;
  activeBooking?: BookingDto | null;
  onBookingCreated?: (booking: BookingDto | null) => void;
}

export function PriceBreakdownCard({
  workspaceId,
  resourceId,
  startTime,
  endTime,
  priceType = 'HOURLY',
  customerNotes,
  seatCode = 'Desk A-01',
  activeBooking,
  onBookingCreated
}: PriceBreakdownCardProps) {
  const { formatPrice, currency } = useCurrency();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingDto | null>(activeBooking || null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Price calculation query from backend
  const { data: priceData, isLoading: isCalculating } = useCalculatePriceQuery(
    workspaceId && resourceId && startTime && endTime
      ? {
          workspaceId,
          resourceId,
          startTime,
          endTime,
          priceType
        }
      : null
  );

  const createBookingMutation = useCreateBookingMutation();
  const cancelBookingMutation = useCancelBookingMutation();

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'NEXFIRST') {
      setDiscountApplied(true);
    }
  };

  const handleCreateAndHoldBooking = async () => {
    setBookingError(null);

    if (!isAuthenticated) {
      setBookingError('Please log in or register before confirming your booking hold.');
      return;
    }

    if (!workspaceId || !resourceId || !startTime || !endTime) {
      setBookingError('Missing required booking parameters. Please choose a workspace and resource.');
      return;
    }

    try {
      const booking = await createBookingMutation.mutateAsync({
        workspaceId,
        resourceId,
        startTime,
        endTime,
        priceType,
        notes: customerNotes
      });

      setCreatedBooking(booking);
      onBookingCreated?.(booking);
      setCheckoutOpen(true);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        'This seat is currently unavailable or already reserved for the chosen time. Please choose another seat.';
      setBookingError(msg);
    }
  };

  const handleCancelHold = async () => {
    const target = createdBooking || activeBooking;
    if (!target) return;
    try {
      await cancelBookingMutation.mutateAsync({
        id: target.id,
        reason: 'Customer cancelled during 15-minute hold'
      });
      setCreatedBooking(null);
      onBookingCreated?.(null);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      setBookingError(errorObj?.response?.data?.message || errorObj?.message || 'Failed to cancel hold.');
    }
  };

  // Base fallback calculation if query is pending or not yet resolved
  const durationHours = priceData?.durationHours || 4;
  const unitPrice = priceData?.unitPrice || 2.5;
  const baseRate = priceData?.baseAmount || durationHours * unitPrice;
  const platformFee = priceData?.serviceFeeAmount || 1.0;
  const vat = priceData?.taxAmount || baseRate * 0.08;
  const promoDiscount = discountApplied ? 1.0 : 0;
  const totalAmount = priceData
    ? Math.max(0, priceData.finalPrice - promoDiscount)
    : Math.max(0, baseRate + platformFee + vat - promoDiscount);

  return (
    <>
      <div className='bg-card border-border shadow-md sticky top-24 space-y-5 rounded-2xl border p-6'>
        {/* Header */}
        <div className='border-border/60 flex items-center justify-between border-b pb-4'>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Price Breakdown
          </h2>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' />
            <span>Guaranteed Rate</span>
          </div>
        </div>

        {/* Error Notification */}
        {bookingError && (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5'>
            <AlertCircle className='size-4 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='font-semibold'>{bookingError}</p>
              {!isAuthenticated && (
                <div className='mt-2'>
                  <Button size='sm' asChild className='h-7 text-xs'>
                    <Link to='/auth'>Log in to account</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className='border-border/60 space-y-3 border-b py-2 text-xs sm:text-sm'>
          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Base Rate ({durationHours} hrs × {formatPrice(unitPrice)})
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium font-mono'>
              {isCalculating ? <Loader2 className='size-3.5 animate-spin inline' /> : formatPrice(baseRate)}
            </span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Platform Service Fee &amp; Infrastructure
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium font-mono'>{formatPrice(platformFee)}</span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground'>VAT (8% standard included)</span>
            <span className='text-muted-foreground font-medium font-mono'>{formatPrice(vat)}</span>
          </div>

          {discountApplied && (
            <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
              <span className='flex items-center gap-1.5'>
                <Tag className='h-3.5 w-3.5' />
                Promo Discount (NEXFIRST)
              </span>
              <span className='font-mono'>-{formatPrice(promoDiscount)}</span>
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
              className='bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 h-10 flex-grow rounded-lg border px-3 text-xs uppercase transition-colors focus:ring-1 focus:outline-none font-mono'
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
                15-Min guaranteed lock • Local taxes included
              </p>
            </div>
            <div className='text-right'>
              <span className='text-primary font-sans text-2xl font-bold tracking-tight sm:text-3xl font-mono'>
                {isCalculating ? (
                  <Loader2 className='size-6 animate-spin inline text-primary' />
                ) : (
                  formatPrice(totalAmount)
                )}
              </span>
              <span className='text-muted-foreground block text-xs font-semibold'>
                {priceData?.currency || currency}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        {createdBooking ? (
          <div className='space-y-2'>
            <Button
              onClick={() =>
                navigate({
                  to: '/workspaces/confirmation',
                  search: { bookingCode: createdBooking.bookingCode }
                })
              }
              className='h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2'
            >
              <CheckCircle2 className='size-4' />
              <span>View Digital Pass ({createdBooking.bookingCode})</span>
            </Button>
            <Button
              variant='outline'
              onClick={handleCancelHold}
              disabled={cancelBookingMutation.isPending}
              className='h-9 w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/80'
            >
              {cancelBookingMutation.isPending ? (
                <>
                  <Loader2 className='size-3.5 animate-spin mr-1.5' />
                  <span>Releasing hold...</span>
                </>
              ) : (
                <span>Cancel Hold &amp; Release Seat</span>
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleCreateAndHoldBooking}
            disabled={createBookingMutation.isPending || isCalculating}
            className='group h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                <span>Locking Seat &amp; Creating Hold...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Hold 15 Min</span>
                <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
              </>
            )}
          </Button>
        )}

        {/* Payment Security & Trust Badges */}
        <div className='border-border/60 space-y-2.5 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2.5'>
            <Wallet className='text-primary h-4 w-4 shrink-0' />
            <span>
              <strong className='text-foreground'>Instant VietQR / PayOS:</strong> Zero latency lock &amp; e-ticket
            </span>
          </div>
          <div className='flex items-center gap-2.5'>
            <Lock className='text-emerald-600 dark:text-emerald-400 h-4 w-4 shrink-0' />
            <span>Pessimistic concurrency lock • Anti-double-booking guarantee</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <FileText className='text-muted-foreground h-4 w-4 shrink-0' />
            <span>Instant turnstile QR pass issued on hold</span>
          </div>
        </div>

        {/* Reassurance pill */}
        <div className='bg-muted/70 text-muted-foreground rounded-lg p-2.5 text-center text-xs'>
          Free cancellation anytime during the 15-minute hold window
        </div>
      </div>

      <PayOSCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmountUsd={totalAmount}
        seatCode={seatCode}
        bookingCode={createdBooking?.bookingCode}
        orderRef={createdBooking ? `#${createdBooking.bookingCode}` : undefined}
      />
    </>
  );
}
