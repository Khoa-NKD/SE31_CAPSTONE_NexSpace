import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Eye,
  Heart,
  Star,
  MapPin,
  Map,
  ArrowRight,
  Wifi,
  Monitor,
  Coffee,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourcePhoto } from '../types';
import { cn } from '@/lib/utils';

interface ResourceLivePreviewCardProps {
  displayName: string;
  floorLevel: string;
  zoneSection: string;
  capacity: number;
  hourlyRate: string;
  primaryPhoto?: ResourcePhoto;
  selectedAmenities: string[];
}

export function ResourceLivePreviewCard({
  displayName,
  floorLevel,
  zoneSection,
  capacity,
  hourlyRate,
  primaryPhoto,
  selectedAmenities
}: ResourceLivePreviewCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  // Derive short location subtitle e.g. "Floor 12 • Zone A (Quiet Zone) • 1 Person"
  const floorShort = floorLevel.includes('—')
    ? floorLevel.split('—')[0].trim()
    : floorLevel;
  const zoneShort = zoneSection.includes('—')
    ? zoneSection.split('—')[0].trim()
    : zoneSection;

  const photoUrl =
    primaryPhoto?.url ||
    'https://lh3.googleusercontent.com/aida/AEtjO1UIdSVk6MUzmhBeOyprhzPqV7rh7BP5PBq4dBUtS22JsoNW8Ngczi9CrQQwfVwBVHnjOLNWr4uFeizVznnN7MppTiqt2w0ehK5qDg48eFA8V9iihsIyUKjG6__9XJH7K8a4bBlKYOwqNfot6Weode9p66dpCkGUw5MHlZXWL18539ipBfucT4Fr2Y8K4ElVpGlnP-29Bk1Qgg7QYUGVatgFd5ft1ZGs4yIabMYQ_hhrHmdEI2lIFBnUJ0F3';

  return (
    <div className='sticky top-20 space-y-4'>
      {/* Live Customer Preview Card */}
      <div className='bg-card border border-border rounded-2xl overflow-hidden shadow-lg'>
        {/* Card Header Bar */}
        <div className='px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/40'>
          <span className='text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm uppercase tracking-wider'>
            Live Customer Preview
          </span>
          <span className='text-xs text-muted-foreground flex items-center gap-1.5'>
            <Eye className='size-3.5' aria-hidden='true' />
            <span>Public View</span>
          </span>
        </div>

        {/* Hero Photo Aspect Ratio 16/10 */}
        <div className='relative aspect-[16/10] bg-muted overflow-hidden group'>
          <img
            src={photoUrl}
            alt={displayName || 'Seat Preview'}
            className='size-full object-cover transition-transform duration-500 group-hover:scale-105'
          />

          {/* Floating Price Pill */}
          <div className='absolute bottom-3 left-3 bg-background/90 text-foreground font-bold text-sm px-3 py-1 rounded-lg backdrop-blur-md shadow-md border border-border/60 flex items-center gap-1'>
            <span>${hourlyRate || '0.00'}</span>
            <span className='text-xs font-normal text-muted-foreground'>/ hr</span>
          </div>

          {/* Heart Button */}
          <button
            type='button'
            onClick={() => setIsFavorited(!isFavorited)}
            className='absolute top-3 right-3 bg-background/90 backdrop-blur-md rounded-full size-8 flex items-center justify-center text-foreground hover:scale-110 shadow-sm border border-border/60 transition-transform cursor-pointer'
            aria-label='Save to favorites'
          >
            <Heart
              className={cn(
                'size-4 transition-colors',
                isFavorited
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-muted-foreground hover:text-rose-500'
              )}
            />
          </button>
        </div>

        {/* Card Body */}
        <div className='p-5 space-y-3.5'>
          {/* Title */}
          <h3 className='font-bold text-foreground text-base leading-snug line-clamp-2'>
            {displayName || 'Untitled Resource'}
          </h3>

          {/* Location & Capacity */}
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <MapPin className='size-3.5 text-muted-foreground/80 shrink-0' aria-hidden='true' />
            <span className='truncate'>
              {floorShort} • {zoneShort} • {capacity} {capacity === 1 ? 'Person' : 'People'}
            </span>
          </div>

          {/* Rating & Verified Bookings */}
          <div className='flex items-center gap-2 pb-3 border-b border-border text-xs'>
            <div className='flex items-center gap-1 text-amber-500 font-bold'>
              <Star className='size-3.5 fill-current' aria-hidden='true' />
              <span>4.9</span>
            </div>
            <span className='text-muted-foreground/50'>•</span>
            <span className='text-muted-foreground'>(18 verified bookings)</span>
          </div>

          {/* Selected Amenity Icons Grid */}
          <div className='grid grid-cols-4 gap-2 pt-1 pb-2'>
            <div
              className={cn(
                'flex flex-col items-center gap-1 text-center transition-opacity',
                selectedAmenities.includes('1 Gbps Fiber WiFi') ? 'opacity-100' : 'opacity-40'
              )}
            >
              <div className='size-8 rounded-lg bg-muted flex items-center justify-center text-primary'>
                <Wifi className='size-4' aria-hidden='true' />
              </div>
              <span className='text-[10px] text-muted-foreground font-medium'>1 Gbps</span>
            </div>

            <div
              className={cn(
                'flex flex-col items-center gap-1 text-center transition-opacity',
                selectedAmenities.includes('Dual 4K Monitors') ? 'opacity-100' : 'opacity-40'
              )}
            >
              <div className='size-8 rounded-lg bg-muted flex items-center justify-center text-primary'>
                <Monitor className='size-4' aria-hidden='true' />
              </div>
              <span className='text-[10px] text-muted-foreground font-medium'>Dual 4K</span>
            </div>

            <div
              className={cn(
                'flex flex-col items-center gap-1 text-center transition-opacity',
                selectedAmenities.includes('Free Barista Coffee') ? 'opacity-100' : 'opacity-40'
              )}
            >
              <div className='size-8 rounded-lg bg-muted flex items-center justify-center text-primary'>
                <Coffee className='size-4' aria-hidden='true' />
              </div>
              <span className='text-[10px] text-muted-foreground font-medium'>Espresso</span>
            </div>

            <div
              className={cn(
                'flex flex-col items-center gap-1 text-center transition-opacity',
                selectedAmenities.includes('USB-C Dock') ? 'opacity-100' : 'opacity-40'
              )}
            >
              <div className='size-8 rounded-lg bg-muted flex items-center justify-center text-primary'>
                <Zap className='size-4' aria-hidden='true' />
              </div>
              <span className='text-[10px] text-muted-foreground font-medium'>USB-C PD</span>
            </div>
          </div>

          {/* Consumer Action CTA Preview Button */}
          <Button
            type='button'
            disabled
            className='w-full h-10 font-medium text-xs bg-primary/75 text-primary-foreground shadow-sm cursor-not-allowed opacity-90'
            title='Preview mode only: customer checkout flow'
          >
            Select Seat &amp; Hold (10 Min)
          </Button>
        </div>
      </div>

      {/* Floor Plan Position Sub-Card */}
      <div className='bg-card border border-border rounded-xl p-4 shadow-xs'>
        <div className='flex items-start gap-3'>
          <div className='size-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0'>
            <Map className='size-4 text-primary' aria-hidden='true' />
          </div>

          <div className='min-w-0 space-y-1.5'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-xs font-semibold text-foreground'>
                Floor Plan Position: Not Assigned
              </span>
              <span className='text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded'>
                Unmapped
              </span>
            </div>

            <p className='text-[11px] text-muted-foreground leading-relaxed'>
              This seat will be listed on marketplace search (C01 &amp; C04). You can also place it onto the visual 2D floor plan map (C05) later.
            </p>

            <Link
              to='/dashboard/organizer/floorplan'
              className='text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 pt-1'
            >
              <span>Assign on 2D Floor Plan (O12)</span>
              <ArrowRight className='size-3' aria-hidden='true' />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
