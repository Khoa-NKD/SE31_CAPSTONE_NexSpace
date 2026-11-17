import { Link } from '@tanstack/react-router';
import {
  Calendar,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import { DateTimePickerModal } from '../detail/date-time-picker-modal';

interface SeatReservationWidgetProps {
  monitorAddonSelected?: boolean;
}

export function SeatReservationWidget({
  monitorAddonSelected = false
}: SeatReservationWidgetProps) {
  const { formatPrice, currency } = useCurrency();

  const hourlyRate = 2.50;
  const hours = 4;
  const monitorHourlyRate = 1.50;
  const monitorTotal = monitorAddonSelected ? monitorHourlyRate * hours : 0;
  const standardTotal = hourlyRate * hours;
  const subtotal = standardTotal + monitorTotal;
  const vatAmount = subtotal * 0.08;
  const totalDue = subtotal + vatAmount;

  return (
    <aside className='sticky top-24'>
      <div className='bg-card border-border shadow-md space-y-5 rounded-xl border p-6'>
        {/* Pricing Header */}
        <div className='border-border/60 flex items-baseline justify-between border-b pb-4'>
          <div>
            <span className='font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
              {formatPrice(hourlyRate)}
            </span>
            <span className='text-muted-foreground text-xs font-medium'> / hour</span>
          </div>
          <div className='text-right'>
            <span className='rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'>
              $18.00 / Day Pass
            </span>
            <p className='text-muted-foreground mt-0.5 text-[11px]'>Save 25% on full day</p>
          </div>
        </div>

        {/* Live Hold Status Indicator */}
        <div className='flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10'>
          <span className='relative flex h-2.5 w-2.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
            <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600' />
          </span>
          <span className='text-xs font-semibold text-emerald-900 dark:text-emerald-300'>
            Instant Confirmation • 10-min Free Hold
          </span>
        </div>

        {/* Reservation Details Box with DateTimePickerModal */}
        <div className='border-border/80 bg-muted/30 rounded-xl border p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
              Selected Slot
            </span>
            <DateTimePickerModal>
              <button
                type='button'
                className='text-primary hover:text-primary/80 cursor-pointer text-xs font-semibold underline underline-offset-2'
              >
                Change
              </button>
            </DateTimePickerModal>
          </div>

          <div className='flex items-center gap-2.5'>
            <Calendar className='text-primary h-5 w-5 shrink-0' />
            <div className='text-xs'>
              <p className='text-foreground font-semibold'>Today, Jan 25, 2026</p>
              <p className='text-muted-foreground text-[11px]'>09:00 AM – 01:00 PM (4 hours duration)</p>
            </div>
          </div>
        </div>

        {/* Selected Seat Pill */}
        <div className='border-border/70 bg-muted/40 flex items-center justify-between rounded-lg border border-dashed p-3 text-xs'>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='text-primary h-4 w-4 shrink-0' />
            <span className='text-foreground font-medium'>Desk A-04 (Executive Hot Desk)</span>
          </div>
          <span className='text-emerald-600 dark:text-emerald-400 font-bold'>Selected</span>
        </div>

        {/* Monitor Add-on Item if Selected */}
        {monitorAddonSelected && (
          <div className='border-border/70 bg-primary/5 flex items-center justify-between rounded-lg border p-2.5 text-xs'>
            <span className='text-foreground font-medium'>Dell 27" 4K Monitor (4 hrs)</span>
            <span className='text-primary font-semibold'>{formatPrice(monitorTotal)}</span>
          </div>
        )}

        {/* Cost Breakdown List */}
        <div className='border-border/60 space-y-2 border-b pb-4 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>Standard Rate ({hours} hrs × {formatPrice(hourlyRate)})</span>
            <span className='text-foreground font-medium'>{formatPrice(standardTotal)}</span>
          </div>

          {monitorAddonSelected && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Monitor Add-on ({hours} hrs × $1.50)</span>
              <span className='text-foreground font-medium'>{formatPrice(monitorTotal)}</span>
            </div>
          )}

          <div className='flex justify-between text-muted-foreground'>
            <span className='flex items-center gap-1'>
              Platform fee &amp; 1Gbps WiFi
              <Info className='h-3 w-3 text-muted-foreground/60' />
            </span>
            <span className='text-emerald-600 dark:text-emerald-400 font-medium'>Free ($0.00)</span>
          </div>

          <div className='flex justify-between text-muted-foreground'>
            <span>VAT &amp; Facilities Surcharge (8%)</span>
            <span className='text-foreground font-medium'>{formatPrice(vatAmount)}</span>
          </div>

          <div className='border-border/60 flex items-baseline justify-between border-t pt-3'>
            <span className='text-foreground text-sm font-bold'>Total Due</span>
            <div className='text-right'>
              <span className='text-primary font-sans text-xl font-bold tracking-tight'>
                {formatPrice(totalDue)}
              </span>
              <span className='text-muted-foreground text-[11px] font-medium'> {currency}</span>
            </div>
          </div>
        </div>

        {/* Primary Booking Action (links to /workspaces/review) */}
        <Button
          asChild
          className='group h-11 w-full cursor-pointer rounded-lg text-sm font-semibold shadow-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
        >
          <Link to='/workspaces/review'>
            <span>Select This Seat &amp; Continue</span>
            <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
          </Link>
        </Button>

        {/* Secondary Actions */}
        <div className='grid grid-cols-2 gap-2'>
          <Button
            asChild
            variant='outline'
            className='cursor-pointer text-xs font-medium h-9'
          >
            <Link to='/workspaces/seats'>Compare Adjacent</Link>
          </Button>
          <Button
            asChild
            variant='outline'
            className='cursor-pointer text-xs font-medium h-9'
          >
            <Link to='/workspaces/seats'>View on 2D Plan</Link>
          </Button>
        </div>

        {/* Security & Guarantee Badges */}
        <div className='border-border/60 space-y-2 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='text-primary h-4 w-4 shrink-0' />
            <span>PayOS 256-bit encrypted checkout</span>
          </div>
          <div className='flex items-center gap-2'>
            <CalendarCheck className='text-primary h-4 w-4 shrink-0' />
            <span>Free cancellation up to 1 hr before start</span>
          </div>
          <div className='flex items-center gap-2'>
            <QrCode className='text-primary h-4 w-4 shrink-0' />
            <span>Instant mobile QR key access generated</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

