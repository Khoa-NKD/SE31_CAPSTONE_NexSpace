import { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Wifi
} from 'lucide-react';
import { NexSpaceLogo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

interface DigitalPassCardProps {
  seatCode?: string;
  zone?: string;
  hubName?: string;
  address?: string;
  pinCode?: string;
  wifiSsid?: string;
  wifiPass?: string;
  startTime?: string;
  endTime?: string;
  holdExpiresAt?: string | null;
  status?: string;
  qrTokenHash?: string | null;
  bookingCode?: string;
  dateStr?: string;
  timeSlot?: string;
}

export function DigitalPassCard({
  seatCode = 'Desk A-12',
  zone = 'Standard Zone',
  hubName = 'NexSpace Prime Hub',
  address = '72 Le Thanh Ton, District 1, HCMC',
  wifiSsid = 'NexSpace-5G',
  wifiPass = 'sprint2026',
  startTime,
  endTime,
  status = 'CONFIRMED',
  dateStr,
  timeSlot
}: DigitalPassCardProps) {
  const [copiedWifi, setCopiedWifi] = useState(false);

  const handleCopyWifi = () => {
    navigator.clipboard?.writeText(wifiPass);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const schedule = formatSchedule(startTime, endTime);

  const statusBadge =
    status === 'CONFIRMED' ? (
      <span className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'>
        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
        CONFIRMED &amp; READY
      </span>
    ) : status === 'PENDING_PAYMENT' ? (
      <span className='bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'>
        <span className='h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse' />
        15-MIN HOLD ACTIVE
      </span>
    ) : status === 'PENDING_APPROVAL' ? (
      <span className='bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'>
        <span className='h-1.5 w-1.5 rounded-full bg-blue-500' />
        PENDING APPROVAL
      </span>
    ) : (
      <span className='bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'>
        <span className='h-1.5 w-1.5 rounded-full bg-primary' />
        {status}
      </span>
    );

  return (
    <div className='bg-card border-border shadow-xl relative w-full max-w-[540px] overflow-hidden rounded-2xl border transition-all'>
      {/* 1. Ticket Header */}
      <div className='bg-card border-border/70 border-b p-6 pb-5'>
        <div className='mb-3 flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='bg-secondary h-2 w-2 rounded-full animate-pulse' />
            <span className='font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
              DIGITAL ACCESS PASS
            </span>
          </div>
          {statusBadge}
        </div>

        {/* Hub Branding Row */}
        <div className='flex flex-wrap items-center gap-2'>
          <NexSpaceLogo variant='horizontal' className='h-6 w-auto' />
          <span className='text-foreground font-sans text-base font-bold sm:text-lg'>
            • {hubName}
          </span>
        </div>

        {/* Address & Navigation */}
        <div className='text-muted-foreground mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs'>
          <div className='flex items-center gap-1.5'>
            <MapPin className='text-primary h-3.5 w-3.5 shrink-0' />
            <span>{address}</span>
          </div>
          <a
            href='https://maps.google.com'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary text-primary/80 inline-flex cursor-pointer items-center gap-1 font-medium transition-colors'
          >
            <span>Get Directions</span>
            <ExternalLink className='h-3 w-3' />
          </a>
        </div>
      </div>

      {/* 2. Ticket Body Details (2-Column Grid) */}
      <div className='bg-card grid grid-cols-2 gap-x-6 gap-y-4 p-6'>
        {/* Col 1: Resource */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Assigned Resource</div>
          <div className='flex items-center gap-2'>
            <span className='text-foreground font-sans text-base font-bold font-mono'>
              {seatCode}
            </span>
            <span className='bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-medium'>
              Quiet Station
            </span>
          </div>
        </div>

        {/* Col 2: Floor & Zone */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Floor &amp; Zone</div>
          <div className='text-foreground text-sm font-semibold'>
            {zone}
          </div>
          <span className='text-muted-foreground text-[11px] block'>
            High-Speed Data &amp; Power
          </span>
        </div>

        {/* Col 3: Date */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Date &amp; Schedule</div>
          <div className='text-foreground text-sm font-medium'>
            {dateStr || schedule.dateStr}
          </div>
        </div>

        {/* Col 4: Time Slot */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Time Slot</div>
          <div className='text-foreground text-sm font-medium'>
            {timeSlot || schedule.timeStr}
          </div>
          <span className='text-muted-foreground text-[11px] block'>
            {schedule.durationHours ? `${schedule.durationHours} Hours Reserved` : 'Reserved & Guaranteed'}
          </span>
        </div>

        {/* Col 5: WiFi Credentials */}
        <div className='border-border/60 col-span-full border-t pt-3'>
          <div className='text-muted-foreground mb-1.5 text-xs'>High-Speed WiFi</div>
          <div className='bg-muted/60 border-border/80 flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs text-foreground'>
            <div className='flex items-center gap-1.5 text-[11px]'>
              <span className='text-muted-foreground flex items-center gap-1'>
                <Wifi className='h-3.5 w-3.5 text-primary' />
                SSID:
              </span>
              <span className='font-semibold'>{wifiSsid}</span>
            </div>
            <div className='flex items-center gap-1.5 text-[11px]'>
              <span className='text-muted-foreground'>Pass:</span>
              <button
                type='button'
                onClick={handleCopyWifi}
                className='hover:text-primary flex cursor-pointer items-center gap-1 font-mono font-semibold transition-colors'
                title='Copy WiFi Password'
              >
                <span>{wifiPass}</span>
                {copiedWifi ? (
                  <Check className='h-3 w-3 text-emerald-600' />
                ) : (
                  <Copy className='text-muted-foreground h-3 w-3' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSchedule(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) {
    return {
      dateStr: 'Today',
      timeStr: '09:00 AM – 01:00 PM',
      durationHours: 4
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10 || 1;

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const dateStr = !isNaN(start.getTime())
    ? start.toLocaleDateString('en-US', dateOptions)
    : 'Selected Date';

  const timeStr =
    !isNaN(start.getTime()) && !isNaN(end.getTime())
      ? `${start.toLocaleTimeString('en-US', timeOptions)} – ${end.toLocaleTimeString('en-US', timeOptions)}`
      : '09:00 AM – 01:00 PM';

  return { dateStr, timeStr, durationHours: hours };
}
