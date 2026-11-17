import { Coffee, PhoneCall, Lock, DoorClosed } from 'lucide-react';

export function SeatProximityMap() {
  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Header */}
      <div>
        <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
          Location &amp; Amenities Proximity
        </h2>
        <p className='text-muted-foreground mt-0.5 text-xs'>
          Positioned strategically within Level 14 for optimal silence and quick facility access.
        </p>
      </div>

      {/* Proximity Distances */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='bg-muted/50 border-border/70 flex items-center gap-3 rounded-lg border p-3.5'>
          <Coffee className='text-primary h-5 w-5 shrink-0' />
          <div>
            <p className='text-foreground text-xs font-semibold sm:text-sm'>15m to Barista Bar</p>
            <p className='text-muted-foreground text-[11px]'>Free cold brew &amp; artisan espresso</p>
          </div>
        </div>

        <div className='bg-muted/50 border-border/70 flex items-center gap-3 rounded-lg border p-3.5'>
          <PhoneCall className='text-primary h-5 w-5 shrink-0' />
          <div>
            <p className='text-foreground text-xs font-semibold sm:text-sm'>8m to Phone Pod M-01</p>
            <p className='text-muted-foreground text-[11px]'>Soundproof confidential booth</p>
          </div>
        </div>

        <div className='bg-muted/50 border-border/70 flex items-center gap-3 rounded-lg border p-3.5'>
          <Lock className='text-primary h-5 w-5 shrink-0' />
          <div>
            <p className='text-foreground text-xs font-semibold sm:text-sm'>22m to Smart Lockers</p>
            <p className='text-muted-foreground text-[11px]'>RFID lockers &amp; executive washrooms</p>
          </div>
        </div>
      </div>

      {/* Mini Architectural Floor Plan Blueprint */}
      <div className='bg-muted/20 border-border/70 relative overflow-hidden rounded-xl border p-5'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2 text-xs'>
          <span className='text-foreground flex items-center gap-2 font-bold tracking-wider'>
            <span className='h-2 w-2 rounded-full bg-primary' />
            LEVEL 14 BLUEPRINT — ZONE A DETAIL
          </span>
          <span className='text-muted-foreground font-medium'>West Façade Glass Frontage</span>
        </div>

        {/* Spatial Blueprint Grid */}
        <div className='border-border/80 bg-card/60 relative flex min-h-[190px] items-center justify-center rounded-lg border border-dashed p-4'>
          {/* Window Wall Indicator Left */}
          <div className='border-primary bg-primary/20 absolute top-0 bottom-0 left-0 flex w-4 flex-col items-center justify-around rounded-l border-r-2'>
            <span className='text-primary text-[8px] font-bold uppercase tracking-widest [writing-mode:vertical-rl]'>
              Glass Façade
            </span>
          </div>

          {/* Desk Cluster Layout */}
          <div className='ml-6 grid w-full max-w-lg grid-cols-4 gap-3 sm:gap-4'>
            {/* Desk A-01 */}
            <div className='border-border/60 bg-muted/40 text-muted-foreground flex h-16 flex-col items-center justify-center rounded-lg border text-xs'>
              <span className='font-semibold'>A-01</span>
              <span className='text-[10px] text-muted-foreground/70'>Occupied</span>
            </div>

            {/* Desk A-02 */}
            <div className='border-border/60 bg-muted/40 text-muted-foreground flex h-16 flex-col items-center justify-center rounded-lg border text-xs'>
              <span className='font-semibold'>A-02</span>
              <span className='text-[10px] text-muted-foreground/70'>Occupied</span>
            </div>

            {/* Desk A-03 */}
            <div className='border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 flex h-16 flex-col items-center justify-center rounded-lg border text-xs'>
              <span className='font-bold'>A-03</span>
              <span className='text-[10px]'>Open</span>
            </div>

            {/* Desk A-04 (Selected) */}
            <div className='border-primary bg-primary/10 text-primary ring-4 ring-primary/20 relative flex h-16 flex-col items-center justify-center rounded-lg border-2 text-xs font-bold shadow-md'>
              <span>A-04</span>
              <span className='text-[10px]'>You Are Here</span>
              <span className='bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold'>
                ✓
              </span>
            </div>
          </div>

          {/* Nearby Amenities Tags on Blueprint */}
          <div className='border-border bg-card text-foreground absolute top-2 right-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] shadow-xs'>
            <DoorClosed className='text-primary h-3.5 w-3.5' />
            <span>Pod M-01 (8m)</span>
          </div>

          <div className='border-border bg-card text-foreground absolute right-3 bottom-2 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] shadow-xs'>
            <Coffee className='text-primary h-3.5 w-3.5' />
            <span>Barista Bar (15m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

