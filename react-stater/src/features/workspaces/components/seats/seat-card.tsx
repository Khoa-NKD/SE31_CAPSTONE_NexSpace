import React from 'react';
import {
  Zap,
  Armchair,
  Wifi,
  Maximize2,
  Monitor,
  Lock,
  BadgeCheck,
  Ear,
  Video,
  Wind,
  Cable,
  Network,
  Coffee,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { SeatItem } from '../../types/seat';

interface SeatCardProps {
  seat: SeatItem;
  onSelect: (seat: SeatItem) => void;
}

const amenityIconMap: Record<string, React.ElementType> = {
  zap: Zap,
  chair: Armchair,
  wifi: Wifi,
  maximize: Maximize2,
  monitor: Monitor,
  lock: Lock,
  badge: BadgeCheck,
  ear: Ear,
  video: Video,
  wind: Wind,
  cable: Cable,
  network: Network,
  coffee: Coffee
};

export function SeatCard({ seat, onSelect }: SeatCardProps) {
  const { formatPrice } = useCurrency();

  const durationHours = 4;
  const totalPrice = seat.pricePerHour * durationHours;

  const categoryLabel =
    seat.category === 'hot_desk'
      ? 'Hot Desk'
      : seat.category === 'dedicated_desk'
        ? 'Dedicated Desk'
        : 'Meeting Pod';

  const selectLabel = seat.category === 'meeting_pod' ? 'Select Pod' : 'Select Seat';

  return (
    <article
      className={`bg-card rounded-xl border p-4 sm:p-5 flex flex-col md:flex-row items-stretch gap-5 transition-all duration-300 hover:shadow-md ${
        seat.isTopPick
          ? 'border-primary/40 ring-2 ring-primary/20 shadow-xs'
          : 'border-border shadow-xs hover:border-primary/40'
      }`}
    >
      {/* Thumbnail Left */}
      <div className='bg-muted relative h-44 w-full shrink-0 overflow-hidden rounded-lg md:h-auto md:w-56'>
        <Link to='/workspaces/seat-detail' className='block h-full w-full cursor-pointer'>
          <img
            src={seat.imageUrl}
            alt={seat.imageAlt}
            className='h-full w-full object-cover transition-transform duration-500 hover:scale-105'
            loading='lazy'
          />
        </Link>
        <div className='absolute top-2.5 left-2.5 flex flex-col items-start gap-1'>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded shadow-xs ${
              seat.category === 'dedicated_desk'
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground text-background'
            }`}
          >
            {categoryLabel}
          </span>
          <span className='inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
            {seat.statusLabel}
          </span>
        </div>
        <span className='bg-background/85 text-foreground backdrop-blur-xs absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-[10px] font-medium border border-border/50'>
          Level {seat.level} • {seat.code}
        </span>
      </div>

      {/* Center Metadata */}
      <div className='flex flex-grow flex-col justify-between space-y-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
              <Link to='/workspaces/seat-detail' className='hover:text-primary transition-colors'>
                {seat.name}
              </Link>
            </h2>
            <span className='bg-muted text-muted-foreground border-border/60 rounded-full border px-2.5 py-0.5 text-xs font-medium'>
              {seat.tag}
            </span>
          </div>
          <p className='text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs'>
            <MapPin className='text-primary h-3.5 w-3.5 shrink-0' />
            <span>
              Level {seat.level} — {seat.zone} ({seat.zoneDescription})
            </span>
          </p>
        </div>

        {/* Amenities Chip Badges Grid */}
        <div className='flex flex-wrap gap-2 pt-1'>
          {seat.amenities.map((amenity, idx) => {
            const Icon = amenityIconMap[amenity.icon] || Zap;
            return (
              <div
                key={idx}
                className='bg-muted/60 border-border/70 text-muted-foreground flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs'
              >
                <Icon className='text-primary h-3.5 w-3.5 shrink-0' />
                <span>{amenity.label}</span>
              </div>
            );
          })}
        </div>

        {/* Booking Guarantee Badge */}
        <div className='text-muted-foreground flex flex-wrap items-center gap-2 pt-1 text-xs'>
          <span className='inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-3.5 w-3.5' />
            {seat.bookingGuarantee}
          </span>
          <span className='text-muted-foreground/40'>•</span>
          <span className='text-muted-foreground/80'>{seat.guaranteeSubtext}</span>
        </div>
      </div>

      {/* Right Pricing & CTA Section */}
      <div className='border-border flex w-full shrink-0 flex-col justify-between border-t pt-4 md:w-52 md:border-t-0 md:border-l md:pt-0 md:pl-5'>
        <div className='space-y-1.5'>
          <div className='flex items-baseline justify-between md:flex-col md:items-start'>
            <span className='text-muted-foreground text-xs font-medium'>Standard Rate</span>
            <div className='flex items-baseline gap-1'>
              <span className='text-foreground font-sans text-2xl font-bold tracking-tight'>
                {formatPrice(seat.pricePerHour)}
              </span>
              <span className='text-muted-foreground text-xs font-medium'>/ hr</span>
            </div>
          </div>
          <div className='bg-muted/60 border-border/70 rounded-lg border p-2.5 text-xs space-y-1'>
            <div className='flex justify-between text-muted-foreground'>
              <span>Duration ({durationHours} hrs):</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className='border-border/60 flex justify-between font-semibold text-foreground border-t pt-1'>
              <span>Total:</span>
              <span className='text-primary'>{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>

        <div className='space-y-1.5 pt-3'>
          <Button
            onClick={() => onSelect(seat)}
            className='group h-11 w-full cursor-pointer rounded-lg text-sm font-semibold shadow-xs transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2'
          >
            <span>{selectLabel}</span>
            <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
          </Button>
          <p className='text-muted-foreground flex items-center justify-center gap-1 text-center font-mono text-[11px]'>
            <Timer className='text-amber-500 h-3 w-3 shrink-0' />
            <span>{seat.microcopy}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

