import { useState, useEffect } from 'react';
import {
  X,
  Timer,
  ShieldCheck,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Lock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { SeatItem } from '../../types/seat';

interface SeatBookingDialogProps {
  seat: SeatItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeatBookingDialog({
  seat,
  open,
  onOpenChange
}: SeatBookingDialogProps) {
  const { formatPrice } = useCurrency();
  const [secondsRemaining, setSecondsRemaining] = useState(600); // 10 minutes hold
  const [isBooked, setIsBooked] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsBooked(false);
      setSecondsRemaining(600);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  if (!seat) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const basePrice = seat.pricePerHour * 4;
  const vatAmount = basePrice * 0.08;
  const totalPrice = basePrice + vatAmount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-card border-border sm:max-w-[500px] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden'>
        {/* Header */}
        <div className='border-border/60 flex items-start justify-between border-b p-5 pb-4'>
          <div className='space-y-1'>
            <DialogHeader className='p-0 text-left'>
              <DialogTitle className='text-foreground text-lg font-bold tracking-tight'>
                {isBooked ? 'Reservation Confirmed!' : `Confirm Reservation — ${seat.code}`}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground text-xs'>
                {isBooked
                  ? 'Your smart access keycard and receipt are ready.'
                  : 'Review your reservation summary before instant settlement.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogClose asChild>
            <button
              aria-label='Close dialog'
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95'
              type='button'
            >
              <X className='h-4 w-4' />
            </button>
          </DialogClose>
        </div>

        {/* Content Body */}
        <div className='space-y-4 p-5'>
          {isBooked ? (
            /* Success confirmation screen */
            <div className='space-y-4 text-center py-2'>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex h-14 w-14 items-center justify-center rounded-full'>
                <CheckCircle2 className='h-8 w-8' />
              </div>
              <div className='space-y-1'>
                <h3 className='text-foreground text-base font-bold'>
                  {seat.name} is Reserved for You
                </h3>
                <p className='text-muted-foreground text-xs'>
                  Booking reference <strong className='text-foreground font-mono'>#NX-8829-01</strong>
                </p>
              </div>

              {/* QR Smart Lock Pass Card */}
              <div className='bg-muted/70 border-border/80 rounded-xl border p-4 space-y-3 text-left'>
                <div className='flex items-center gap-3'>
                  <div className='bg-card border-border flex h-12 w-12 items-center justify-center rounded-lg border shadow-xs'>
                    <QrCode className='h-8 w-8 text-primary' />
                  </div>
                  <div>
                    <div className='text-foreground text-xs font-bold'>
                      Mobile Turnstile &amp; Door Pass
                    </div>
                    <div className='text-muted-foreground text-[11px]'>
                      Level {seat.level} • {seat.zone} (Valid Jan 25, 2026)
                    </div>
                  </div>
                </div>
                <div className='text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/60'>
                  <ShieldCheck className='h-3.5 w-3.5 text-emerald-600' />
                  <span>Instant e-invoice sent to your account email</span>
                </div>
              </div>

              <Button
                asChild
                onClick={() => onOpenChange(false)}
                className='w-full cursor-pointer h-10 font-semibold flex items-center justify-center gap-2'
              >
                <Link to='/workspaces/confirmation'>
                  <span>View Digital Pass &amp; Confirmation</span>
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </Button>
            </div>
          ) : (
            /* Reservation details & checkout screen */
            <>
              {/* Seat Snapshot */}
              <div className='bg-muted/50 border-border/70 flex items-center gap-3.5 rounded-xl border p-3'>
                <img
                  src={seat.imageUrl}
                  alt={seat.imageAlt}
                  className='h-16 w-20 rounded-lg object-cover'
                />
                <div className='space-y-0.5 text-xs'>
                  <div className='text-foreground font-bold'>{seat.name}</div>
                  <div className='text-muted-foreground flex items-center gap-1 text-[11px]'>
                    <MapPin className='h-3 w-3 text-primary' />
                    <span>Level {seat.level} — {seat.zone}</span>
                  </div>
                  <div className='text-primary font-semibold text-[11px]'>
                    {seat.tag}
                  </div>
                </div>
              </div>

              {/* Reservation Timing */}
              <div className='border-border/60 bg-card rounded-xl border p-3 text-xs space-y-2'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='flex items-center gap-1.5'>
                    <Calendar className='h-3.5 w-3.5 text-primary' />
                    Date
                  </span>
                  <span className='text-foreground font-semibold'>Sat, Jan 25, 2026</span>
                </div>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='flex items-center gap-1.5'>
                    <Clock className='h-3.5 w-3.5 text-primary' />
                    Time Slot
                  </span>
                  <span className='text-foreground font-semibold'>09:00 AM - 01:00 PM (4 hrs)</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className='border-border/60 rounded-xl border p-3 text-xs space-y-1.5'>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Duration (4 hrs × {formatPrice(seat.pricePerHour)}/hr)</span>
                  <span className='text-foreground font-medium'>{formatPrice(basePrice)}</span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>High-speed WiFi 6 &amp; Power PD</span>
                  <span className='text-emerald-600 font-semibold dark:text-emerald-400'>
                    Included ($0.00)
                  </span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>VAT (8%)</span>
                  <span className='text-foreground font-medium'>{formatPrice(vatAmount)}</span>
                </div>
                <div className='border-border/60 flex items-center justify-between border-t pt-2 font-bold'>
                  <span className='text-foreground text-sm'>Total Settlement</span>
                  <span className='text-primary text-base'>{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {/* 10-Minute Hold Reservation Banner */}
              <div className='bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-between rounded-lg border px-3 py-2 text-xs'>
                <div className='flex items-center gap-2 font-medium'>
                  <Timer className='h-4 w-4' />
                  <span>Reservation Hold Active</span>
                </div>
                <span className='font-mono font-bold'>{timeFormatted}</span>
              </div>

              {/* Checkout CTA */}
              <div className='space-y-2'>
                <Button
                  onClick={() => setIsBooked(true)}
                  className='w-full cursor-pointer h-11 text-sm font-semibold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2'
                >
                  <span>Confirm &amp; Pay via PayOS</span>
                  <ArrowRight className='h-4 w-4' />
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='w-full cursor-pointer h-10 text-xs font-semibold'
                >
                  <Link to='/workspaces/review'>
                    <span>Full Review &amp; 10-Minute Hold Page</span>
                    <ArrowRight className='h-3.5 w-3.5 ml-1' />
                  </Link>
                </Button>
              </div>

              {/* Reassurance notes */}
              <div className='flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1'>
                <span className='flex items-center gap-1'>
                  <Lock className='h-3 w-3' />
                  256-Bit SSL
                </span>
                <span>•</span>
                <span className='flex items-center gap-1 text-emerald-600 dark:text-emerald-400'>
                  <ShieldCheck className='h-3 w-3' />
                  Free cancellation up to 1 hr
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
