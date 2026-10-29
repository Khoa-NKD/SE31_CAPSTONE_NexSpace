import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { WorkspaceItem } from '../api/types';

interface ReserveModalProps {
  workspace: WorkspaceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReserveModal({ workspace, isOpen, onClose }: ReserveModalProps) {
  const [durationHours, setDurationHours] = useState(2);
  const [selectedDate, setSelectedDate] = useState('Today (Immediate)');
  const [guestCount, setGuestCount] = useState(1);

  if (!workspace) return null;

  const totalEstimate = workspace.hourlyPrice * durationHours * guestCount;

  const handleConfirm = () => {
    toast.success(`Booking Confirmed for ${workspace.title}!`, {
      description: `Reserved for ${guestCount} person(s) · ${durationHours}h · $${totalEstimate}. Check your inbox for the digital entry pass.`
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold'>Reserve Your Space</DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Instant confirmation with encrypted keycard access pass.
          </DialogDescription>
        </DialogHeader>

        <div className='mt-2 space-y-4'>
          {/* Workspace Preview Mini Card */}
          <div className='bg-muted/50 border-border/80 flex items-center gap-3.5 rounded-xl border p-3'>
            <img
              src={workspace.imageUrl}
              alt={workspace.title}
              className='h-16 w-20 rounded-lg object-cover'
            />
            <div className='min-w-0 flex-1'>
              <h4 className='text-foreground truncate text-sm font-semibold'>{workspace.title}</h4>
              <div className='text-muted-foreground mt-0.5 flex items-center gap-1 text-xs'>
                <MapPin className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{workspace.location}</span>
              </div>
              <div className='mt-1 flex items-center gap-1 text-xs font-medium text-amber-500'>
                <Star className='h-3 w-3 fill-amber-500' />
                <span>
                  {workspace.rating} ({workspace.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Form Parameters */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label
                htmlFor='reserve-date'
                className='text-foreground mb-1 block text-xs font-semibold'
              >
                Date & Slot
              </label>
              <div className='border-input bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'>
                <Calendar className='text-muted-foreground h-4 w-4' />
                <select
                  id='reserve-date'
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className='w-full cursor-pointer bg-transparent text-xs outline-none'
                >
                  <option value='Today (Immediate)'>Today (Immediate)</option>
                  <option value='Tomorrow'>Tomorrow</option>
                  <option value='Next Monday'>Next Monday</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor='reserve-duration'
                className='text-foreground mb-1 block text-xs font-semibold'
              >
                Duration (Hours)
              </label>
              <div className='border-input bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'>
                <Clock className='text-muted-foreground h-4 w-4' />
                <select
                  id='reserve-duration'
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className='w-full cursor-pointer bg-transparent text-xs outline-none'
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours (Half Day)</option>
                  <option value={8}>8 hours (Full Day)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor='reserve-guests'
              className='text-foreground mb-1 block text-xs font-semibold'
            >
              Guests
            </label>
            <div className='border-input bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'>
              <Users className='text-muted-foreground h-4 w-4' />
              <select
                id='reserve-guests'
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className='w-full cursor-pointer bg-transparent text-xs outline-none'
              >
                <option value={1}>1 Person</option>
                <option value={2}>2 People</option>
                <option value={4}>4 People</option>
                <option value={8}>8 People</option>
              </select>
            </div>
          </div>

          {/* Pricing summary */}
          <div className='border-border/60 bg-muted/30 rounded-lg border p-3 text-sm'>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>Rate:</span>
              <span>
                ${workspace.hourlyPrice}/hr × {durationHours}h × {guestCount} guest(s)
              </span>
            </div>
            <div className='mt-2 flex items-center justify-between border-t border-border/40 pt-2 font-semibold text-foreground'>
              <span>Estimated Total:</span>
              <span className='text-base font-bold text-[#4b41e1]'>${totalEstimate}</span>
            </div>
          </div>
        </div>

        <DialogFooter className='mt-4 flex gap-2 sm:justify-end'>
          <Button variant='outline' onClick={onClose} className='cursor-pointer'>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className='bg-[#4b41e1] hover:bg-[#4338CA] cursor-pointer text-white shadow-sm'
          >
            Confirm Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
