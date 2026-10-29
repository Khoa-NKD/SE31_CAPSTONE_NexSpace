import React from 'react';
import {
  Check,
  Wifi,
  Monitor,
  Armchair,
  Zap,
  BatteryCharging,
  Sun,
  Coffee,
  VolumeX,
  LucideIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AVAILABLE_AMENITIES } from '../data/mock-create-resource';
import { cn } from '@/lib/utils';

const AMENITY_ICONS: Record<string, LucideIcon> = {
  Wifi,
  Monitor,
  Armchair,
  Zap,
  BatteryCharging,
  Sun,
  Coffee,
  VolumeX
};

interface ResourceSpecsAmenitiesSectionProps {
  capacity: number;
  specifications: string;
  selectedAmenities: string[];
  onChangeCapacity: (capacity: number) => void;
  onChangeSpecifications: (specs: string) => void;
  onToggleAmenity: (amenityLabel: string) => void;
}

export function ResourceSpecsAmenitiesSection({
  capacity,
  specifications,
  selectedAmenities,
  onChangeCapacity,
  onChangeSpecifications,
  onToggleAmenity
}: ResourceSpecsAmenitiesSectionProps) {
  return (
    <section className='border-t border-border pt-6 space-y-6'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>
          Specifications &amp; Amenities
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Provide dimensions and ergonomic details for discerning business tenants
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Maximum Capacity */}
        <div className='md:col-span-1 space-y-1.5'>
          <Label htmlFor='resource-capacity' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Maximum Capacity <span className='text-destructive'>*</span>
          </Label>
          <div className='relative'>
            <Input
              id='resource-capacity'
              type='number'
              min={1}
              max={200}
              value={capacity}
              onChange={(e) => onChangeCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              className='h-10 pr-20 text-sm font-semibold text-foreground bg-background border-input focus-visible:ring-primary'
            />
            <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none'>
              Person(s)
            </span>
          </div>
          <p className='text-[11px] text-muted-foreground'>
            {capacity === 1 ? 'Single Dedicated Station.' : `Supports group of up to ${capacity} people.`}
          </p>
        </div>

        {/* Room Description / Specifications */}
        <div className='md:col-span-2 space-y-1.5'>
          <Label htmlFor='resource-specs' className='text-xs font-semibold text-foreground'>
            Room Description / Specifications
          </Label>
          <Textarea
            id='resource-specs'
            rows={3}
            value={specifications}
            onChange={(e) => onChangeSpecifications(e.target.value)}
            placeholder='Detail motorized sit-stand desk, monitors, soundproofing, and window view...'
            className='text-xs text-foreground bg-background border-input focus-visible:ring-primary leading-relaxed resize-none'
          />
        </div>
      </div>

      {/* Included Amenities Toggles */}
      <div className='space-y-2.5'>
        <Label className='text-xs font-semibold text-foreground'>
          Included Amenities
        </Label>
        <div className='flex flex-wrap gap-2'>
          {AVAILABLE_AMENITIES.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity.label);
            const Icon = AMENITY_ICONS[amenity.iconName] || Wifi;

            return (
              <button
                key={amenity.id}
                type='button'
                onClick={() => onToggleAmenity(amenity.label)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer select-none active:scale-95',
                  isSelected
                    ? 'border-primary/80 bg-primary/10 text-primary dark:text-primary-foreground shadow-2xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <Check className='size-3.5 text-primary stroke-[2.5]' aria-hidden='true' />
                ) : (
                  <Icon className='size-3.5 text-muted-foreground' aria-hidden='true' />
                )}
                <span>{amenity.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
