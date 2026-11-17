import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Laptop,
  CreditCard,
  PlusCircle
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { BookingItem, BookingResourceType, PaymentGateway } from '../types';

interface ManualReservationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBooking: (newBooking: BookingItem) => void;
}

const AVAILABLE_RESOURCES: { name: string; zone: string; category: BookingResourceType; ratePerHour: number }[] = [
  { name: 'Hot Desk #04', zone: 'Quiet Zone (Level 2)', category: 'HOT_DESK', ratePerHour: 5 },
  { name: 'Hot Desk #12', zone: 'Open Co-working (Level 1)', category: 'HOT_DESK', ratePerHour: 5 },
  { name: 'Executive Suite #02', zone: 'Private Wing (Level 3)', category: 'DEDICATED_DESK', ratePerHour: 15 },
  { name: 'Glass Pod B', zone: 'Meeting Hub (Level 2)', category: 'MEETING_ROOM', ratePerHour: 20 },
  { name: 'Boardroom Grand Alpha', zone: 'Executive Center (Level 4)', category: 'MEETING_ROOM', ratePerHour: 45 },
  { name: 'Focus Booth #01', zone: 'Silent Library (Level 1)', category: 'BOOTH', ratePerHour: 8 },
  { name: 'Podcast Recording Suite', zone: 'Media Lab (Level B1)', category: 'BOOTH', ratePerHour: 25 }
];

function calculateDuration(start: string, end: string): number {
  const [startH = 0, startM = 0] = start.split(':').map(Number);
  const [endH = 0, endM = 0] = end.split(':').map(Number);
  const diffMinutes = endH * 60 + endM - (startH * 60 + startM);
  return diffMinutes > 0 ? Math.max(1, Math.round(diffMinutes / 60)) : 1;
}

export function ManualReservationDialog({
  isOpen,
  onClose,
  onCreateBooking
}: ManualReservationDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedResourceIdx, setSelectedResourceIdx] = useState('0');
  const [date, setDate] = useState('Jan 25, 2026');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>('PAYOS_QR');
  const [notes, setNotes] = useState('');

  const durationHours = calculateDuration(startTime, endTime);
  const selectedResource = AVAILABLE_RESOURCES[Number(selectedResourceIdx)] || AVAILABLE_RESOURCES[0];
  const calculatedTotal = selectedResource.ratePerHour * durationHours;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const initials = customerName.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    const newBooking: BookingItem = {
      id: `book-${randomSuffix}`,
      bookingCode: `#NX-${randomSuffix}`,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim() || '+84 901 234 567',
      customerInitials: initials,
      customerAvatarColor: 'bg-primary-fixed text-primary',
      resourceCode: `UNIT-${randomSuffix.toString().slice(-2)}`,
      resourceName: selectedResource.name,
      resourceCategory: selectedResource.category,
      resourceZone: selectedResource.zone,
      reservedDate: date,
      reservedTimeWindow: `${startTime} - ${endTime} (${durationHours} hours)`,
      durationHours,
      amount: calculatedTotal,
      paymentGateway,
      paymentGatewayLabel: paymentGateway === 'PAYOS_QR' ? 'PayOS Banking QR' : paymentGateway === 'PAYOS_CARD' ? 'PayOS Card Checkout' : 'PayOS MoMo',
      status: 'CONFIRMED',
      checkInState: 'UPCOMING',
      createdAt: 'Just now',
      notes: notes.trim() || undefined
    };

    onCreateBooking(newBooking);
    onClose();

    // Reset form
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Create Walk-in / Manual Reservation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Book an instant workspace slot for on-site clients with integrated PayOS gateway verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> Customer Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="custName" className="text-xs">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="custName"
                    placeholder="e.g. Alex Nguyen"
                    className="pl-9 h-9 text-xs"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="custEmail" className="text-xs">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="custEmail"
                    type="email"
                    placeholder="alex@techcorp.com"
                    className="pl-9 h-9 text-xs"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="custPhone" className="text-xs">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="custPhone"
                    placeholder="+84 901 234 567"
                    className="pl-9 h-9 text-xs"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resource Selection */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-primary" /> Resource & Space
            </h4>
            <div className="space-y-1">
              <Label className="text-xs">Select Available Workspace Unit</Label>
              <Select
                value={selectedResourceIdx}
                onValueChange={(val) => setSelectedResourceIdx(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Choose resource" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_RESOURCES.map((r, i) => (
                    <SelectItem key={r.name} value={String(i)}>
                      {r.name} ({r.zone}) — ${r.ratePerHour}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time & Schedule */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Date & Time Slot
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bookingDate" className="text-xs">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="bookingDate"
                    className="pl-8 h-9 text-xs font-mono"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  className="h-9 text-xs font-mono"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endTime" className="text-xs">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  className="h-9 text-xs font-mono"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
              <span>Duration Estimated:</span>
              <span className="font-semibold text-foreground">{durationHours} Hours</span>
            </div>
          </div>

          {/* Payment & Settlement */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Settlement & Fee
            </h4>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={paymentGateway}
                  onValueChange={(val: PaymentGateway) => setPaymentGateway(val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAYOS_QR">PayOS Banking QR (Instant)</SelectItem>
                    <SelectItem value="PAYOS_CARD">Credit / Debit Card</SelectItem>
                    <SelectItem value="PAYOS_MOMO">MoMo / E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-right">
                <span className="text-[11px] text-muted-foreground block">Total Amount Due</span>
                <span className="text-base font-extrabold text-foreground font-mono">
                  ${calculatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1 pt-2">
            <Label htmlFor="notes" className="text-xs">Special Requests or Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g. VIP guest, requested dual 4K monitors and USB-C dock"
              className="text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2">
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
              <PlusCircle className="w-3.5 h-3.5" /> Confirm & Issue Pass
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

