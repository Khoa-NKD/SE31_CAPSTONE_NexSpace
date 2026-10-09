import { useState } from 'react';
import type { SeatItem } from '../../types/seat';
import { SeatCard } from './seat-card';
import { SeatBookingDialog } from './seat-booking-dialog';
import { Armchair } from 'lucide-react';

interface SeatsListProps {
  seats: SeatItem[];
}

export function SeatsList({ seats }: SeatsListProps) {
  const [selectedSeat, setSelectedSeat] = useState<SeatItem | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const handleSelectSeat = (seat: SeatItem) => {
    setSelectedSeat(seat);
    setBookingDialogOpen(true);
  };

  if (seats.length === 0) {
    return (
      <div className='bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center'>
        <div className='bg-muted text-muted-foreground mb-4 flex h-14 w-14 items-center justify-center rounded-full'>
          <Armchair className='h-7 w-7' />
        </div>
        <h3 className='text-foreground text-base font-bold'>No resources found</h3>
        <p className='text-muted-foreground mt-1 max-w-sm text-xs'>
          Try selecting another category or adjusting your booking schedule to find available seats.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-4'>
        {seats.map((seat) => (
          <SeatCard key={seat.id} seat={seat} onSelect={handleSelectSeat} />
        ))}
      </div>

      <SeatBookingDialog
        seat={selectedSeat}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
    </>
  );
}

