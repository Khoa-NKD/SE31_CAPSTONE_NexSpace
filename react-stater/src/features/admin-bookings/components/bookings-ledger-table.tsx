import React from 'react';
import { Calendar, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookingItem } from '../data/mock-bookings';

interface BookingsLedgerTableProps {
  items: BookingItem[];
  selectedBookingId?: string;
  onSelectBooking: (item: BookingItem) => void;
}

function getBookingStatusBadge(status: BookingItem['status']) {
  switch (status) {
    case 'confirmed':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-indigo-500' aria-hidden='true'></span>
          Confirmed
        </span>
      );
    case 'checked_in':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' aria-hidden='true'></span>
          Checked In
        </span>
      );
    case 'completed':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border'>
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'>
          Cancelled
        </span>
      );
  }
}

function handleCopyId(e: React.MouseEvent, id: string) {
  e.stopPropagation();
  navigator.clipboard?.writeText(id);
  toast.success(`Booking ID #${id} Copied to Clipboard`);
}

export function BookingsLedgerTable({
  items,
  selectedBookingId,
  onSelectBooking
}: BookingsLedgerTableProps) {

  if (items.length === 0) {
    return (
      <div className='p-12 text-center bg-card rounded-xl border border-border shadow-2xs'>
        <Calendar className='size-10 text-muted-foreground mx-auto mb-3 opacity-60' aria-hidden='true' />
        <h3 className='text-sm font-semibold text-foreground'>No bookings match criteria</h3>
        <p className='text-xs text-muted-foreground mt-1'>
          Try clearing your search query or switching status filters.
        </p>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs' aria-label='Platform bookings management ledger table'>
          <thead>
            <tr className='border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              <th scope='col' className='px-4 py-3.5'>Booking ID</th>
              <th scope='col' className='px-4 py-3.5'>Customer</th>
              <th scope='col' className='px-4 py-3.5'>Workspace Hub</th>
              <th scope='col' className='px-4 py-3.5'>Resource / Desk</th>
              <th scope='col' className='px-4 py-3.5'>Time Slot</th>
              <th scope='col' className='px-4 py-3.5'>Gross Amount</th>
              <th scope='col' className='px-4 py-3.5'>Status</th>
              <th scope='col' className='px-4 py-3.5 text-right'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {items.map((booking) => {
              const isSelected = selectedBookingId === booking.id;

              return (
                <tr
                  key={booking.id}
                  onClick={() => onSelectBooking(booking)}
                  className={`group cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  {/* Booking ID */}
                  <td className='px-4 py-4'>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-mono font-bold text-foreground text-xs sm:text-sm group-hover:text-primary transition-colors'>
                        #{booking.id}
                      </span>
                      <button
                        type='button'
                        onClick={(e) => handleCopyId(e, booking.id)}
                        className='p-1 rounded text-muted-foreground hover:text-foreground transition-colors'
                        title='Copy Booking ID'
                        aria-label={`Copy Booking ID #${booking.id}`}
                      >
                        <Copy className='size-3' aria-hidden='true' />
                      </button>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className='px-4 py-4' aria-label={booking.customer.name}>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0'>
                        {booking.customer.avatarInitials}
                      </div>
                      <div>
                        <div className='font-semibold text-foreground flex items-center gap-1.5'>
                          <span>{booking.customer.name}</span>
                          <span className='text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/80'>
                            {booking.customer.membershipTier}
                          </span>
                        </div>
                        <div className='text-[11px] text-muted-foreground'>{booking.customer.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Workspace Hub */}
                  <td className='px-4 py-4'>
                    <div className='font-medium text-foreground'>{booking.workspace.name}</div>
                    <div className='text-[11px] text-muted-foreground'>{booking.workspace.zone}</div>
                  </td>

                  {/* Resource / Desk */}
                  <td className='px-4 py-4'>
                    <span className='font-medium text-foreground'>{booking.workspace.resourceName}</span>
                  </td>

                  {/* Time Slot */}
                  <td className='px-4 py-4 text-muted-foreground'>
                    <span>{booking.timeSlot}</span>
                  </td>

                  {/* Gross Amount */}
                  <td className='px-4 py-4 font-mono font-semibold text-foreground'>
                    <span>{booking.grossAmountDisplay}</span>
                  </td>

                  {/* Status */}
                  <td className='px-4 py-4'>
                    {getBookingStatusBadge(booking.status)}
                  </td>

                  {/* Action */}
                  <td className='px-4 py-4 text-right'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(booking);
                      }}
                      className='h-8 px-3 text-xs gap-1 hover:border-primary hover:text-primary'
                      aria-label={`Inspect booking details for #${booking.id}`}
                    >
                      <span>Inspect</span>
                      <ChevronRight className='size-3.5' aria-hidden='true' />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className='p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div>
          Showing <strong className='text-foreground font-semibold'>{items.length}</strong> of{' '}
          <strong className='text-foreground font-semibold'>1,420</strong> total bookings
        </div>
        <div className='inline-flex items-center gap-1.5'>
          <button
            type='button'
            disabled
            className='px-2.5 py-1 rounded border border-border bg-card text-muted-foreground opacity-50 cursor-not-allowed'
          >
            Previous
          </button>
          <span className='px-2.5 py-1 rounded bg-primary text-white font-semibold'>1</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            2
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            3
          </button>
          <span className='px-1 text-muted-foreground'>...</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            142
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
