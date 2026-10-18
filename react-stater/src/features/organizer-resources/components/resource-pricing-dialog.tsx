import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Coins, Zap, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceItem } from '../types';

interface ResourcePricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceItem | null;
  onSavePricing: (id: string, hourly: number, daily: number) => void;
}

interface PricingFormContentProps {
  resource: ResourceItem;
  onSave: (id: string, hourly: number, daily: number) => void;
  onClose: () => void;
}

function PricingFormContent({
  resource,
  onSave,
  onClose
}: PricingFormContentProps) {
  const [hourly, setHourly] = useState<number>(resource.hourlyRate);
  const [daily, setDaily] = useState<number>(resource.dailyRate);
  const [peakMultiplier, setPeakMultiplier] = useState<string>('1.0');
  const [minDuration, setMinDuration] = useState<string>('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(resource.id, Number(hourly), Number(daily));
    onClose();
    toast.success('Custom Price Matrix Updated', {
      description: `Updated rates for ${resource.code} to $${hourly}/hr and $${daily}/day.`
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2 text-xs'>
      {/* Base rates */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='hourly-rate' className='text-xs font-semibold'>
            Base Hourly Rate ($)
          </Label>
          <Input
            id='hourly-rate'
            type='number'
            step='0.1'
            min={0}
            value={hourly}
            onChange={(e) => setHourly(Number(e.target.value))}
            className='h-9 text-xs'
            required
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='daily-rate' className='text-xs font-semibold'>
            Daily Pass Rate ($)
          </Label>
          <Input
            id='daily-rate'
            type='number'
            step='0.5'
            min={0}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
            className='h-9 text-xs'
            required
          />
        </div>
      </div>

      {/* Peak hour surge */}
      <div className='space-y-1.5'>
        <Label className='text-xs font-semibold flex items-center gap-1.5'>
          <Zap className='size-3.5 text-amber-500' />
          <span>Peak Hours Multiplier (09:00 - 17:00)</span>
        </Label>
        <Select value={peakMultiplier} onValueChange={setPeakMultiplier}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1.0' className='text-xs'>Standard Rate (1.0x - No Surge)</SelectItem>
            <SelectItem value='1.15' className='text-xs'>+15% Peak Demand (1.15x)</SelectItem>
            <SelectItem value='1.25' className='text-xs'>+25% Prime Business Hours (1.25x)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Minimum duration */}
      <div className='space-y-1.5'>
        <Label className='text-xs font-semibold flex items-center gap-1.5'>
          <CalendarDays className='size-3.5 text-muted-foreground' />
          <span>Minimum Booking Duration</span>
        </Label>
        <Select value={minDuration} onValueChange={setMinDuration}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1' className='text-xs'>1 Hour Minimum</SelectItem>
            <SelectItem value='2' className='text-xs'>2 Hours Minimum</SelectItem>
            <SelectItem value='4' className='text-xs'>Half Day (4 Hours)</SelectItem>
            <SelectItem value='8' className='text-xs'>Full Day (8 Hours)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter className='pt-2 gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClose}
          className='text-xs'
        >
          Cancel
        </Button>
        <Button type='submit' size='sm' className='text-xs font-semibold'>
          Save Price Matrix
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResourcePricingDialog({
  open,
  onOpenChange,
  resource,
  onSavePricing
}: ResourcePricingDialogProps) {
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[460px] p-5'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold flex items-center gap-2'>
            <Coins className='size-5 text-primary' />
            <span>Pricing Matrix: {resource.code}</span>
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Configure granular hourly rates, full-day discounts, and surge pricing for this unit.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <PricingFormContent
            key={resource.id}
            resource={resource}
            onSave={onSavePricing}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

