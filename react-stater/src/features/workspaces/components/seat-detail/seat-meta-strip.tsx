import { Star, VolumeX, Sunset, Wifi, QrCode } from 'lucide-react';

export function SeatMetaStrip() {
  const metaBadges = [
    {
      icon: VolumeX,
      label: 'ACOUSTICS',
      value: '< 45 dB Quiet Zone'
    },
    {
      icon: Sunset,
      label: 'ORIENTATION',
      value: 'West Sunset View'
    },
    {
      icon: Wifi,
      label: 'BANDWIDTH',
      value: '1,000 Mbps WiFi 6'
    },
    {
      icon: QrCode,
      label: 'DOOR UNLOCK',
      value: 'Instant Smart QR'
    }
  ];

  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Title & Rating Row */}
      <div className='border-border/60 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center'>
        <div>
          <div className='mb-1.5 flex items-center gap-2'>
            <span className='bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold'>
              ZONE A — EXECUTIVE
            </span>
            <span className='text-muted-foreground text-xs font-medium'>
              Seat ID #CT14-A04
            </span>
          </div>
          <h1 className='text-foreground font-sans text-xl font-bold tracking-tight sm:text-2xl'>
            Desk A-04 — Executive Ergonomic Hot Desk
          </h1>
          <p className='text-muted-foreground mt-1 text-xs sm:text-sm'>
            NexSpace Central Tower, Level 14 — Zone A (Acoustic Ceiling &amp; Natural Sunlight)
          </p>
        </div>

        {/* Rating Block */}
        <div className='flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-col sm:items-end'>
          <div className='flex items-center gap-1'>
            <Star className='h-4 w-4 fill-amber-500 text-amber-500' />
            <span className='font-sans text-base font-bold text-foreground'>4.96</span>
          </div>
          <span className='text-muted-foreground text-xs'>(42 reviews)</span>
        </div>
      </div>

      {/* Feature Meta Badges Strip */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {metaBadges.map((badge, idx) => {
          const Icon = badge.icon;
          return (
            <div
              key={idx}
              className='bg-muted/50 border-border/60 flex items-center gap-2.5 rounded-lg border p-3'
            >
              <Icon className='text-primary h-5 w-5 shrink-0' />
              <div>
                <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                  {badge.label}
                </p>
                <p className='text-foreground text-xs font-semibold sm:text-sm'>
                  {badge.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

