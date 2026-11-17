import React from 'react';
import { Link } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResourcePricingSectionProps {
  hourlyRate: string;
  dailyRate: string;
  onChangeHourlyRate: (val: string) => void;
  onChangeDailyRate: (val: string) => void;
}

export function ResourcePricingSection({
  hourlyRate,
  dailyRate,
  onChangeHourlyRate,
  onChangeDailyRate
}: ResourcePricingSectionProps) {
  return (
    <section className='border-t border-border pt-6 space-y-5'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>
          Pricing Matrix (Base Rates)
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Set foundational rates before tiered corporate discount tiers
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        {/* Hourly Base Rate */}
        <div className='space-y-1.5'>
          <Label htmlFor='hourly-rate' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Hourly Base Rate <span className='text-destructive'>*</span>
          </Label>
          <div className='relative'>
            <span className='absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground text-sm pointer-events-none'>
              $
            </span>
            <Input
              id='hourly-rate'
              type='text'
              value={hourlyRate}
              onChange={(e) => onChangeHourlyRate(e.target.value)}
              placeholder='2.50'
              className='h-10 pl-8 pr-16 text-sm font-semibold text-foreground bg-background border-input focus-visible:ring-primary'
            />
            <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none'>
              / hour
            </span>
          </div>
        </div>

        {/* Daily Pass Rate */}
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='daily-rate' className='text-xs font-semibold text-foreground'>
              Daily Pass Rate
            </Label>
            <span className='text-[11px] text-muted-foreground font-medium'>
              Optional full-day cap
            </span>
          </div>
          <div className='relative'>
            <span className='absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground text-sm pointer-events-none'>
              $
            </span>
            <Input
              id='daily-rate'
              type='text'
              value={dailyRate}
              onChange={(e) => onChangeDailyRate(e.target.value)}
              placeholder='18.00'
              className='h-10 pl-8 pr-16 text-sm font-semibold text-foreground bg-background border-input focus-visible:ring-primary'
            />
            <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none'>
              / day
            </span>
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className='bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-foreground'>
        <Info className='size-4 text-primary shrink-0 mt-0.5' aria-hidden='true' />
        <p className='leading-relaxed'>
          Volume discounts (e.g., book &gt; 5 hours get 15% off) can be configured in the{' '}
          <Link
            to='/dashboard/organizer/pricing'
            className='font-bold text-primary hover:underline'
          >
            Pricing Matrix (O13)
          </Link>{' '}
          module.
        </p>
      </div>
    </section>
  );
}

