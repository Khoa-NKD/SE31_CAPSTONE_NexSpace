import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { BookingItem } from '../data/mock-bookings';

interface BookingCancelDialogProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BookingCancelDialog({
  booking,
  isOpen,
  onClose,
  onConfirm
}: BookingCancelDialogProps) {
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <div className='w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-2'>
            <AlertTriangle className='size-6' aria-hidden='true' />
          </div>
          <DialogTitle className='text-lg font-bold font-heading text-foreground'>
            Force Cancel &amp; Refund Reservation
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground mt-1'>
            You are initiating an administrative force-cancellation for reservation{' '}
            <strong className='font-mono text-foreground'>#{booking.id}</strong> ({booking.customer.name}).
          </DialogDescription>
        </DialogHeader>

        <div className='p-3.5 rounded-lg bg-muted/50 border border-border space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Customer:</span>
            <span className='font-semibold text-foreground'>{booking.customer.name}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Refund Amount:</span>
            <span className='font-mono font-bold text-foreground'>{booking.grossAmountDisplay}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Escrow Contract:</span>
            <span className='font-mono text-muted-foreground'>{booking.escrow.escrowContractId}</span>
          </div>
        </div>

        <p className='text-xs text-muted-foreground'>
          The reserved workspace unit will be unreserved immediately and 100% of the funds held in PayOS Escrow will be released back to the customer’s payment method.
        </p>

        <DialogFooter className='gap-2 sm:gap-0 mt-2'>
          <Button type='button' variant='outline' size='sm' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={onConfirm}
            className='bg-rose-600 hover:bg-rose-700 text-white font-semibold'
          >
            Confirm Force Cancel &amp; Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
