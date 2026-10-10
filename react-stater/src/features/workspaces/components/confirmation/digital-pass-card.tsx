import { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Wifi,
  QrCode,
  Wallet
} from 'lucide-react';
import { NexSpaceLogo, NexSpaceMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DigitalPassCardProps {
  seatCode?: string;
  zone?: string;
  hubName?: string;
  address?: string;
  pinCode?: string;
  wifiSsid?: string;
  wifiPass?: string;
}

export function DigitalPassCard({
  seatCode = 'Desk A-12',
  zone = 'Zone A',
  hubName = 'Saigon Prime Hub',
  address = '72 Le Thanh Ton, District 1, HCMC',
  pinCode = '8492',
  wifiSsid = 'NexSpace-5G',
  wifiPass = 'sprint2026'
}: DigitalPassCardProps) {
  const [pinVisible, setPinVisible] = useState(true);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(pinCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyWifi = () => {
    navigator.clipboard?.writeText(wifiPass);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const handleAddToWallet = () => {
    setWalletAdded(true);
    setTimeout(() => setWalletAdded(false), 3000);
  };

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
          <span className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
            CONFIRMED &amp; READY
          </span>
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
            <span className='text-foreground font-sans text-base font-bold'>
              {seatCode}
            </span>
            <span className='bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-medium'>
              Quiet Zone
            </span>
          </div>
        </div>

        {/* Col 2: Floor & Zone */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Floor &amp; Zone</div>
          <div className='text-foreground text-sm font-semibold'>
            Level 14 • {zone}
          </div>
          <span className='text-muted-foreground text-[11px] block'>
            West Window View
          </span>
        </div>

        {/* Col 3: Date */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Date &amp; Schedule</div>
          <div className='text-foreground text-sm font-medium'>
            Friday, Jan 25, 2026
          </div>
        </div>

        {/* Col 4: Time Slot */}
        <div>
          <div className='text-muted-foreground mb-1 text-xs'>Time Slot</div>
          <div className='text-foreground text-sm font-medium'>
            09:00 AM – 01:00 PM
          </div>
          <span className='text-muted-foreground text-[11px] block'>
            4 Hours Reserved
          </span>
        </div>

        {/* Col 5: Smart Lock PIN */}
        <div className='border-border/60 col-span-1 border-t pt-3'>
          <div className='text-muted-foreground mb-1.5 text-xs'>Smart-Lock PIN</div>
          <div className='bg-muted/60 border-border/80 inline-flex items-center gap-2 rounded-lg border px-3 py-1 font-mono text-sm font-bold text-foreground'>
            <Lock className='text-primary h-3.5 w-3.5 shrink-0' />
            <span>{pinVisible ? pinCode : '••••'}</span>
            <button
              type='button'
              onClick={() => setPinVisible(!pinVisible)}
              className='hover:text-foreground text-muted-foreground ml-1 cursor-pointer transition-colors'
              title={pinVisible ? 'Mask PIN' : 'Reveal PIN'}
            >
              {pinVisible ? (
                <EyeOff className='h-3.5 w-3.5' />
              ) : (
                <Eye className='h-3.5 w-3.5' />
              )}
            </button>
            <button
              type='button'
              onClick={handleCopyPin}
              className='hover:text-primary text-muted-foreground cursor-pointer transition-colors'
              title='Copy PIN'
            >
              {copiedPin ? (
                <Check className='h-3.5 w-3.5 text-emerald-600' />
              ) : (
                <Copy className='h-3.5 w-3.5' />
              )}
            </button>
          </div>
        </div>

        {/* Col 6: WiFi Credentials */}
        <div className='border-border/60 col-span-1 border-t pt-3'>
          <div className='text-muted-foreground mb-1.5 text-xs'>High-Speed WiFi</div>
          <div className='bg-muted/60 border-border/80 space-y-0.5 rounded-lg border px-3 py-1 text-xs text-foreground'>
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-muted-foreground flex items-center gap-1'>
                <Wifi className='h-3 w-3' />
                SSID:
              </span>
              <span className='font-semibold'>{wifiSsid}</span>
            </div>
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-muted-foreground'>Pass:</span>
              <button
                type='button'
                onClick={handleCopyWifi}
                className='hover:text-primary flex cursor-pointer items-center gap-1 font-mono font-semibold transition-colors'
                title='Copy WiFi Password'
              >
                <span>{wifiPass}</span>
                {copiedWifi ? (
                  <Check className='h-2.5 w-2.5 text-emerald-600' />
                ) : (
                  <Copy className='text-muted-foreground h-2.5 w-2.5' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Airline Ticket Perforation Divider */}
      <div className='bg-card relative flex items-center justify-center py-1'>
        {/* Left cutout notch */}
        <div className='bg-background border-border absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-r shadow-inner' />
        {/* Perforation dashed line */}
        <div className='border-border/80 mx-6 w-full border-b-2 border-dashed' />
        {/* Right cutout notch */}
        <div className='bg-background border-border absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-l shadow-inner' />
      </div>

      {/* 4. Ticket Turnstile Check-in Pass & QR Section */}
      <div className='bg-card flex flex-col items-center p-6 pt-5'>
        <div className='bg-muted/30 border-border/80 flex w-full flex-col items-center gap-4 rounded-xl border p-4 sm:flex-row'>
          {/* Turnstile QR Code with Center NexSpace Mark */}
          <div className='bg-card border-border/80 relative flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border p-2 shadow-xs'>
            <svg
              className='h-full w-full text-foreground'
              fill='currentColor'
              viewBox='0 0 100 100'
            >
              {/* Finders */}
              <rect fill='currentColor' height='26' rx='3' width='26' x='2' y='2' />
              <rect fill='var(--card)' height='18' rx='2' width='18' x='6' y='6' />
              <rect fill='currentColor' height='10' rx='1' width='10' x='10' y='10' />

              <rect fill='currentColor' height='26' rx='3' width='26' x='72' y='2' />
              <rect fill='var(--card)' height='18' rx='2' width='18' x='76' y='6' />
              <rect fill='currentColor' height='10' rx='1' width='10' x='80' y='10' />

              <rect fill='currentColor' height='26' rx='3' width='26' x='2' y='72' />
              <rect fill='var(--card)' height='18' rx='2' width='18' x='6' y='76' />
              <rect fill='currentColor' height='10' rx='1' width='10' x='10' y='80' />

              {/* Data modules */}
              <rect height='6' rx='1' width='6' x='34' y='6' />
              <rect height='6' rx='1' width='8' x='46' y='6' />
              <rect height='6' rx='1' width='6' x='60' y='6' />
              <rect height='6' rx='1' width='8' x='34' y='18' />
              <rect height='6' rx='1' width='6' x='52' y='18' />

              <rect height='8' rx='1' width='6' x='6' y='36' />
              <rect height='6' rx='1' width='8' x='18' y='40' />
              <rect height='8' rx='1' width='6' x='74' y='36' />
              <rect height='6' rx='1' width='8' x='86' y='42' />

              <rect height='6' rx='1' width='8' x='34' y='74' />
              <rect height='8' rx='1' width='6' x='48' y='74' />
              <rect height='6' rx='1' width='8' x='60' y='82' />
              <rect height='6' rx='1' width='8' x='74' y='76' />
              <rect height='8' rx='1' width='6' x='88' y='82' />
            </svg>

            {/* Embedded Logo in Center */}
            <div className='bg-card border-border absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-md border shadow-xs z-10'>
              <NexSpaceMark className='h-5 w-5' />
            </div>
          </div>

          {/* QR Meta & Speed-Gate Instructions */}
          <div className='flex-1 text-center sm:text-left'>
            <div className='text-primary mb-1 inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wider'>
              <QrCode className='h-3.5 w-3.5' />
              <span>Instant Contactless Access</span>
            </div>
            <p className='text-foreground text-xs leading-relaxed font-medium'>
              Scan at speed gate turnstile or concierge tablet on Level 14 for automatic door release.
            </p>
            <div className='text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-[11px] sm:justify-start'>
              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
              <span>Valid for entry 15 mins prior to reserved slot</span>
            </div>
          </div>
        </div>

        {/* 5. Mobile Wallet Pass Trigger */}
        <div className='mt-4 w-full'>
          <Button
            type='button'
            onClick={handleAddToWallet}
            className={cn(
              'flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]',
              walletAdded
                ? 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 dark:bg-emerald-600 dark:text-white dark:border-emerald-500'
                : 'bg-zinc-950 text-white border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:border-zinc-600'
            )}
          >
            {walletAdded ? (
              <>
                <Check className='h-4 w-4 text-white' />
                <span>Pass Saved to Apple Wallet</span>
              </>
            ) : (
              <>
                <Wallet className='h-4 w-4 text-white' />
                <span>Add to Apple Wallet / Google Wallet</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
