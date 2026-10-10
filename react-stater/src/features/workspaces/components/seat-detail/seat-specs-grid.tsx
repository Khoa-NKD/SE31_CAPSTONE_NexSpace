import React from 'react';
import {
  Armchair,
  Zap,
  Gauge,
  ArrowUpDown,
  SunMedium,
  Monitor,
  Check
} from 'lucide-react';

interface SeatSpecsGridProps {
  monitorAddonSelected?: boolean;
  onToggleMonitorAddon?: () => void;
}

export function SeatSpecsGrid({
  monitorAddonSelected = false,
  onToggleMonitorAddon
}: SeatSpecsGridProps) {
  const specs = [
    {
      icon: Armchair,
      title: 'Ergonomic Task Chair',
      description:
        'Herman Miller Aeron (Size B, PostureFit SL lumbar support, fully adjustable 3D armrests & forward tilt lock).'
    },
    {
      icon: Zap,
      title: 'Power & Rapid Charging',
      description:
        '65W USB-C Power Delivery cable + 2x Universal AC surge-protected outlets + integrated Qi fast wireless pad.'
    },
    {
      icon: Gauge,
      title: 'Enterprise Internet Speed',
      description:
        '1,000 Mbps symmetrical Dedicated WiFi 6 + RJ45 Cat6A Gigabit Ethernet jack (4ms average ping to AWS SG).'
    },
    {
      icon: ArrowUpDown,
      title: 'Dual-Motor Standing Desk',
      description:
        'Smooth electric motorized adjustment (70cm – 120cm) with 4 custom memory presets & anti-collision sensors.'
    },
    {
      icon: SunMedium,
      title: 'Lighting & Acoustic Comfort',
      description:
        '500 Lux anti-glare CRI 95 task lamp + ceiling-suspended mineral acoustic dampening baffles.'
    }
  ];

  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Hardware &amp; Ergonomic Specifications
          </h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            Architecturally calibrated for prolonged deep engineering &amp; focused design work.
          </p>
        </div>
        <span className='bg-primary/10 text-primary rounded px-3 py-1 text-xs font-semibold'>
          ISO 9241-5 CERTIFIED
        </span>
      </div>

      {/* Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {specs.map((spec, idx) => {
          const Icon = spec.icon;
          return (
            <div
              key={idx}
              className='bg-muted/30 border-border/70 flex items-start gap-3.5 rounded-xl border p-4'
            >
              <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                <Icon className='h-5 w-5' />
              </div>
              <div className='space-y-1'>
                <h3 className='text-foreground text-xs font-bold sm:text-sm'>
                  {spec.title}
                </h3>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  {spec.description}
                </p>
              </div>
            </div>
          );
        })}

        {/* Item 6: Monitor Add-on Card with Interactive Toggle */}
        <div
          role='button'
          tabIndex={0}
          onClick={onToggleMonitorAddon}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleMonitorAddon?.();
            }
          }}
          className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all ${
            monitorAddonSelected
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
              : 'border-amber-300/80 bg-amber-50/50 hover:border-primary dark:border-amber-500/30 dark:bg-amber-500/10'
          }`}
        >
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'>
            <Monitor className='h-5 w-5' />
          </div>
          <div className='w-full space-y-1'>
            <div className='flex items-center justify-between'>
              <h3 className='text-foreground text-xs font-bold sm:text-sm'>
                Dell 27" 4K Monitor Add-on
              </h3>
              <span className='text-primary text-xs font-bold'>+$1.50/hr</span>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              UltraSharp U2723QE with single-cable 90W USB-C hub connectivity &amp; ergonomic monitor arm.
            </p>
            <div className='flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-primary'>
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  monitorAddonSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card'
                }`}
              >
                {monitorAddonSelected && <Check className='h-3 w-3' />}
              </div>
              <span>{monitorAddonSelected ? 'Added to Reservation' : 'Click to add monitor'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
