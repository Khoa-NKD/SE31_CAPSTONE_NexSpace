import React from 'react';
import { Store } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ResourceRulesSectionProps {
  instantBooking: boolean;
  publishLive: boolean;
  onToggleInstantBooking: (checked: boolean) => void;
  onTogglePublishLive: (checked: boolean) => void;
}

export function ResourceRulesSection({
  instantBooking,
  publishLive,
  onToggleInstantBooking,
  onTogglePublishLive
}: ResourceRulesSectionProps) {
  return (
    <section className='border-t border-border pt-6 space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>
          Publishing &amp; Booking Rules
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Control lifecycle states and consumer-facing listing exposure
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Instant Booking Toggle Card */}
        <div className='p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors'>
          <div className='space-y-1 pr-2'>
            <div className='flex items-center gap-2'>
              <span className='size-2 rounded-full bg-emerald-500 animate-pulse' aria-hidden='true' />
              <Label htmlFor='switch-instant' className='text-sm font-semibold text-foreground cursor-pointer'>
                Instant Booking
              </Label>
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Customers can book immediately without organizer manual approval.
            </p>
          </div>
          <Switch
            id='switch-instant'
            checked={instantBooking}
            onCheckedChange={onToggleInstantBooking}
            className='data-[state=checked]:bg-emerald-600'
            aria-label='Toggle Instant Booking'
          />
        </div>

        {/* Publish Live to Marketplace Toggle Card */}
        <div className='p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors'>
          <div className='space-y-1 pr-2'>
            <div className='flex items-center gap-2'>
              <Store className='size-4 text-primary' aria-hidden='true' />
              <Label htmlFor='switch-publish' className='text-sm font-semibold text-foreground cursor-pointer'>
                Publish Live to Marketplace
              </Label>
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Resource becomes visible on Customer Discovery C01/C04 immediately upon saving.
            </p>
          </div>
          <Switch
            id='switch-publish'
            checked={publishLive}
            onCheckedChange={onTogglePublishLive}
            className='data-[state=checked]:bg-primary'
            aria-label='Toggle Marketplace Visibility'
          />
        </div>
      </div>
    </section>
  );
}

