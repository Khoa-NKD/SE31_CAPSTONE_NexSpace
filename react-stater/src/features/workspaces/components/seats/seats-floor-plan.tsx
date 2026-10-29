import { useState } from 'react';
import {
  Layers,
  MapPin,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { SeatItem } from '../../types/seat';
import { SeatBookingDialog } from './seat-booking-dialog';

interface SeatsFloorPlanProps {
  seats: SeatItem[];
}

export function SeatsFloorPlan({ seats }: SeatsFloorPlanProps) {
  const { formatPrice } = useCurrency();
  const [activeFloor, setActiveFloor] = useState<14 | 15>(14);
  const [selectedSeat, setSelectedSeat] = useState<SeatItem | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const floorSeats = seats.filter((s) => s.level === activeFloor);

  const handleSelectNode = (seat: SeatItem) => {
    setSelectedSeat(seat);
  };

  const handleBookNow = (seat: SeatItem) => {
    setSelectedSeat(seat);
    setBookingDialogOpen(true);
  };

  return (
    <div className='bg-card border-border shadow-xs space-y-4 rounded-2xl border p-4 sm:p-6'>
      {/* Floor Plan Controls Header */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4'>
        <div className='space-y-0.5'>
          <h2 className='text-foreground flex items-center gap-2 text-base font-bold'>
            <Layers className='h-4 w-4 text-primary' />
            Interactive 2D Floor Plan
          </h2>
          <p className='text-muted-foreground text-xs'>
            Click any available workstation node to inspect specs and reserve.
          </p>
        </div>

        {/* Level Switcher */}
        <div className='bg-muted border-border/80 flex items-center rounded-lg border p-1'>
          <button
            type='button'
            onClick={() => setActiveFloor(14)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFloor === 14
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Level 14 (Hot Desks &amp; Pods)
          </button>
          <button
            type='button'
            onClick={() => setActiveFloor(15)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFloor === 15
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Level 15 (Executive Suites)
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1'>
        <div className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20' />
          <span>Hot Desk Available</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20' />
          <span>Dedicated Desk Available</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20' />
          <span>Meeting Pod Available</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-full bg-muted-foreground/30' />
          <span>Reserved / Private</span>
        </div>
      </div>

      {/* Floor Plan Architectural Canvas */}
      <div className='relative w-full overflow-hidden rounded-xl border border-border/80 bg-muted/30 p-2 sm:p-4'>
        <div className='relative aspect-[16/9] min-h-[360px] w-full rounded-lg bg-card/60 p-4 border border-dashed border-border overflow-hidden'>
          {/* Architectural Background Grid & Rooms */}
          <svg
            className='absolute inset-0 h-full w-full stroke-border/40 [stroke-dasharray:4_4]'
            xmlns='http://www.w3.org/2000/svg'
          >
            <defs>
              <pattern
                id='floor-grid'
                width='40'
                height='40'
                patternUnits='userSpaceOnUse'
              >
                <path d='M 40 0 L 0 0 0 40' fill='none' strokeWidth='0.8' />
              </pattern>
            </defs>
            <rect width='100%' height='100%' fill='url(#floor-grid)' />
          </svg>

          {/* Zones & Structural Markings */}
          {activeFloor === 14 ? (
            <>
              {/* Zone A: Quiet Zone (Left) */}
              <div className='absolute top-4 left-4 w-[36%] bottom-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 pointer-events-none'>
                <span className='text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase'>
                  Zone A — Quiet Zone &amp; Window View
                </span>
              </div>

              {/* Zone B: Collaboration (Center) */}
              <div className='absolute top-4 left-[42%] w-[38%] bottom-4 rounded-xl border border-primary/30 bg-primary/5 p-3 pointer-events-none'>
                <span className='text-[11px] font-bold tracking-wider text-primary uppercase'>
                  Zone B — Collaborative &amp; Cafe
                </span>
              </div>

              {/* Media Corridor: Meeting Pods (Right) */}
              <div className='absolute top-4 right-4 w-[16%] bottom-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 pointer-events-none'>
                <span className='text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase'>
                  Pods
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Executive Wing Level 15 */}
              <div className='absolute inset-4 rounded-xl border border-primary/40 bg-primary/5 p-3 pointer-events-none'>
                <span className='text-[11px] font-bold tracking-wider text-primary uppercase'>
                  Level 15 — Executive Wing (Deep Focus Suites &amp; 4K Workstations)
                </span>
              </div>
            </>
          )}

          {/* Interactive Seat Nodes */}
          {floorSeats.map((seat) => {
            const isSelected = selectedSeat?.id === seat.id;
            const nodeColor =
              seat.category === 'meeting_pod'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : seat.category === 'dedicated_desk'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white';

            return (
              <button
                key={seat.id}
                type='button'
                onClick={() => handleSelectNode(seat)}
                style={{
                  left: `${seat.coordinates.x}%`,
                  top: `${seat.coordinates.y}%`
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200 active:scale-95 ${nodeColor} ${
                  isSelected
                    ? 'ring-4 ring-primary/40 scale-110 shadow-lg'
                    : 'hover:scale-105'
                }`}
                title={`${seat.name} (${seat.tag})`}
              >
                {seat.code}
              </button>
            );
          })}
        </div>

        {/* Selected Seat Quick Inspection Drawer / Callout */}
        {selectedSeat && (
          <div className='mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-primary/30 bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200'>
            <div className='flex items-center gap-3.5 w-full sm:w-auto'>
              <img
                src={selectedSeat.imageUrl}
                alt={selectedSeat.imageAlt}
                className='h-14 w-16 rounded-lg object-cover shrink-0'
              />
              <div className='space-y-0.5'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-bold text-foreground'>
                    {selectedSeat.name}
                  </span>
                  <span className='bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full'>
                    {selectedSeat.code}
                  </span>
                </div>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <MapPin className='h-3 w-3 text-primary' />
                  <span>Level {selectedSeat.level} — {selectedSeat.zone}</span>
                </p>
                <p className='text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1'>
                  <CheckCircle2 className='h-3 w-3' />
                  {selectedSeat.bookingGuarantee}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0'>
              <div className='text-left sm:text-right'>
                <div className='text-xs text-muted-foreground'>Total (4 hrs)</div>
                <div className='text-lg font-bold text-foreground'>
                  {formatPrice(selectedSeat.pricePerHour * 4)}
                </div>
              </div>
              <Button
                onClick={() => handleBookNow(selectedSeat)}
                className='cursor-pointer text-xs font-semibold px-4 h-10 shadow-xs'
              >
                <span>Select &amp; Reserve</span>
                <ArrowRight className='h-3.5 w-3.5 ml-1.5' />
              </Button>
            </div>
          </div>
        )}
      </div>

      <SeatBookingDialog
        seat={selectedSeat}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
    </div>
  );
}
