import React, { useState } from 'react';
import {
  User,
  PlusCircle,
  MapPin
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { GanttResource, GanttBookingBlock, GanttBlockType } from '../types';

interface ScheduleSlotBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resource: GanttResource | null;
  defaultStartHour?: number;
  onBookSlot: (resourceId: string, newBlock: GanttBookingBlock) => void;
}

function formatHourString(hr: number): string {
  const h = Math.floor(hr);
  const m = Math.round((hr - h) * 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export function ScheduleSlotBookingDialog({
  isOpen,
  onClose,
  resource,
  defaultStartHour = 10,
  onBookSlot
}: ScheduleSlotBookingDialogProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [blockType, setBlockType] = useState<GanttBlockType>('CONFIRMED');
  const [startHour, setStartHour] = useState(defaultStartHour);
  const [durationHours, setDurationHours] = useState(2);
  const [companyOrNote, setCompanyOrNote] = useState('');

  const endHour = Math.min(20, startHour + durationHours);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !guestName.trim()) return;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newBlock: GanttBookingBlock = {
      id: `blk-${randomSuffix}`,
      bookingCode: blockType === 'MAINTENANCE' ? `#MNT-${randomSuffix}` : `#NX-${randomSuffix}`,
      guestName: guestName.trim(),
      companyOrNote: companyOrNote.trim() || undefined,
      startTime: formatHourString(startHour),
      endTime: formatHourString(endHour),
      startHour,
      endHour,
      type: blockType,
      statusLabel: blockType === 'CONFIRMED' ? 'PayOS Confirmed' : blockType === 'PENDING' ? 'PayOS Hold' : blockType === 'VIP' ? 'VIP' : 'Facility',
      amount: blockType !== 'MAINTENANCE' ? durationHours * 15 : undefined
    };

    onBookSlot(resource.id, newBlock);
    onClose();

    // Reset
    setGuestName('');
    setGuestEmail('');
    setCompanyOrNote('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Schedule Resource Slot
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Book an instant reservation or set a maintenance block directly on the Gantt timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Resource */}
          {resource && (
            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg text-xs">
              <span className="text-muted-foreground">Target Resource:</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {resource.code} ({resource.zone})
              </span>
            </div>
          )}

          {/* Block Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Schedule Type</Label>
            <Select
              value={blockType}
              onValueChange={(val: GanttBlockType) => setBlockType(val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFIRMED">Standard Confirmed Booking</SelectItem>
                <SelectItem value="PENDING">Pending Hold (PayOS)</SelectItem>
                <SelectItem value="VIP">VIP / Corporate Reservation</SelectItem>
                <SelectItem value="MAINTENANCE">Sanitization & Facility Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Guest / Title */}
          <div className="space-y-1.5">
            <Label htmlFor="schedName" className="text-xs">
              {blockType === 'MAINTENANCE' ? 'Maintenance Task Name *' : 'Guest / Host Full Name *'}
            </Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                id="schedName"
                placeholder={blockType === 'MAINTENANCE' ? 'e.g. Deep Sanitization & Desks Wipe' : 'e.g. Tran Minh Tuan'}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="pl-9 h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Email or Company Note */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedEmail" className="text-xs">
                {blockType === 'MAINTENANCE' ? 'Team Lead' : 'Email Address'}
              </Label>
              <Input
                id="schedEmail"
                type={blockType === 'MAINTENANCE' ? 'text' : 'email'}
                placeholder={blockType === 'MAINTENANCE' ? 'Facility Crew A' : 'guest@company.com'}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedCompany" className="text-xs">Organization / Note</Label>
              <Input
                id="schedCompany"
                placeholder="e.g. TechCorp Asia"
                value={companyOrNote}
                onChange={(e) => setCompanyOrNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Time Slot Range */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Time (08:00 - 19:00)</Label>
              <Select
                value={String(startHour)}
                onValueChange={(val) => setStartHour(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs font-mono bg-background">
                  <SelectValue placeholder="Start Time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const h = 8 + i;
                    return (
                      <SelectItem key={h} value={String(h)}>
                        {formatHourString(h)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Select
                value={String(durationHours)}
                onValueChange={(val) => setDurationHours(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs font-mono bg-background">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="3">3 Hours</SelectItem>
                  <SelectItem value="4">4 Hours (Half Day)</SelectItem>
                  <SelectItem value="8">8 Hours (Full Day)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Resulting Slot:</span>
            <span className="font-mono font-bold text-foreground">
              {formatHourString(startHour)} — {formatHourString(endHour)} ({durationHours} hrs)
            </span>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Confirm Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
