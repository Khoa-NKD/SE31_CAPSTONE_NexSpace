import {
  BadgeCheck,
  MapPin,
  Layers,
  Lock,
  Zap,
  Armchair,
  Wifi,
  VolumeX,
  Calendar,
  QrCode
} from 'lucide-react';

export function BookingSummaryCard() {
  const amenities = [
    { icon: Zap, label: '65W USB-C PD' },
    { icon: Armchair, label: 'Aeron Chair' },
    { icon: Wifi, label: '1 Gbps Fiber' },
    { icon: VolumeX, label: '45dB Acoustic' }
  ];

  return (
    <section className='bg-card border-border shadow-xs space-y-5 rounded-2xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div className='flex items-center gap-2.5'>
          <BadgeCheck className='text-primary h-5 w-5' />
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Booking Summary &amp; Space Information
          </h2>
        </div>
        <span className='bg-primary/10 border-primary/20 text-primary rounded-full border px-2.5 py-0.5 text-xs font-semibold'>
          Hot Desk Pass
        </span>
      </div>

      {/* Space Info Row */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='bg-muted border-border/80 relative h-32 w-full shrink-0 overflow-hidden rounded-xl border sm:h-28 sm:w-36'>
          <img
            alt='Quiet Zone Window Desk'
            className='h-full w-full object-cover'
            src='https://lh3.googleusercontent.com/aida-public/AB6AXuBQZwPmZNOtnlrl9geScjc2_LqOmO3iMDS2BG-k0Tgq1X_TAZYziP_JtjXehhVwy65X8vHsA_4APFkn3WL2WVgGzqY1tG7ZdFZJDXYAM4yi1F2FPDXomEzGLydbEscOz4j1aqiGm2NgQrLjS1DibSTc9PZwlURmsi_StjnzUaLLvhQQM4505OVD78C0TjezwhaLSUfEmvllqkoEav21e7ZCyOCDC-NkBkMj3OIFbAbhCfiavD0l7zXFXQ'
          />
          <span className='bg-background/90 text-foreground border-border/60 absolute top-2 left-2 rounded border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-xs'>
            ZONE A
          </span>
        </div>

        <div className='flex-grow space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-foreground font-sans text-base font-bold'>
              NexSpace Central Tower
            </h3>
            <span className='inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
              Instant Access
            </span>
          </div>

          <div className='text-muted-foreground flex items-start gap-1.5 text-xs'>
            <MapPin className='text-primary mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>72 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City</span>
          </div>

          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Layers className='text-primary h-3.5 w-3.5 shrink-0' />
            <span>Level 14 • Zone A (West Window Quiet Zone)</span>
          </div>
        </div>
      </div>

      {/* Highlighted Resource Pill / Badge */}
      <div className='bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold'>
            A12
          </div>
          <div>
            <div className='text-primary text-xs font-semibold sm:text-sm'>
              Desk A-12 (Hot Desk, Quiet Zone)
            </div>
            <p className='text-muted-foreground text-xs'>
              Panoramic city view with sound dampening boundary
            </p>
          </div>
        </div>
        <div className='text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs font-bold uppercase tracking-wider'>
          <Lock className='h-3.5 w-3.5' />
          <span>Locked</span>
        </div>
      </div>

      {/* Included Station Amenities Row */}
      <div className='border-border/60 border-t pt-4'>
        <span className='text-foreground mb-3 block text-xs font-semibold'>
          Included Station Amenities
        </span>
        <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
          {amenities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className='bg-muted/50 border-border/70 flex items-center gap-2 rounded-lg border p-2 text-xs'
              >
                <Icon className='text-primary h-4 w-4 shrink-0' />
                <span className='text-foreground text-xs font-medium'>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Time & Slot */}
      <div className='bg-muted/40 border-border/60 rounded-xl border p-4'>
        <div className='flex items-start gap-3'>
          <div className='bg-card border-border text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs'>
            <Calendar className='h-4 w-4 text-primary' />
          </div>
          <div className='space-y-1 text-xs'>
            <div className='text-foreground font-semibold sm:text-sm'>
              Friday, Jan 25, 2026 • 09:00 AM - 01:00 PM (4 hours)
            </div>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <QrCode className='text-primary h-3.5 w-3.5 shrink-0' />
              <span>
                Digital QR key will be generated immediately after payment. Early check-in opens 10 minutes prior.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

