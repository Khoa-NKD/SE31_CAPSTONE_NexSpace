import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Send,
  XCircle,
  Laptop,
  Users,
  Presentation,
  PhoneCall,
  LockOpen
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookingItem } from '../types';

interface BookingDetailDialogProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReminder?: (booking: BookingItem) => void;
  onCancelBooking?: (id: string) => void;
  onCheckInToggle?: (id: string) => void;
}

function getResourceCategoryIcon(category: string) {
  switch (category) {
    case 'HOT_DESK':
      return <Laptop className="w-4 h-4 text-primary" />;
    case 'DEDICATED_DESK':
      return <Users className="w-4 h-4 text-amber-500" />;
    case 'MEETING_ROOM':
      return <Presentation className="w-4 h-4 text-purple-500" />;
    case 'BOOTH':
      return <PhoneCall className="w-4 h-4 text-blue-500" />;
    default:
      return <Laptop className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 font-semibold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmed & Paid
        </Badge>
      );
    case 'PENDING_PAYMENT':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 font-semibold text-xs">
          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Payment
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 font-semibold text-xs">
          <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelled
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 font-semibold text-xs">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Completed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function BookingDetailDialog({
  booking,
  isOpen,
  onClose,
  onSendReminder,
  onCancelBooking,
  onCheckInToggle
}: BookingDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(booking.bookingCode || booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-foreground">
                  {booking.bookingCode || booking.id}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyId}
                  aria-label="Copy Booking ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                {getStatusBadge(booking.status)}
              </div>
              <DialogTitle className="text-lg font-bold">
                Reservation Details & Audit Log
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Created on {booking.createdAt} • Real-time PayOS Verified
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Customer Profile Section */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> Customer Profile
            </h3>
            <div className="flex items-center gap-4 p-3.5 bg-muted/40 rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {booking.customerInitials || booking.customerName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {booking.customerName}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {booking.customerEmail}
                  </span>
                  {booking.customerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {booking.customerPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Reserved Resource & Time Schedule */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Resource & Space Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Assigned Resource</span>
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-background border border-border">
                    {getResourceCategoryIcon(booking.resourceCategory)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{booking.resourceName}</p>
                    <p className="text-xs text-muted-foreground">{booking.resourceZone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Reserved Time Window</span>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {booking.reservedDate}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {booking.reservedTimeWindow}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Payment & Financial Ledger */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> PayOS Financial Ledger
            </h3>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Gateway & Method</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {booking.paymentGateway === 'PAYOS_QR' ? (
                      <QrCode className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                    )}
                    {booking.paymentGatewayLabel || booking.paymentGateway?.replace('_', ' ') || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Transaction Value</p>
                  <p className="text-base font-extrabold text-foreground font-mono">
                    {formatCurrency(booking.amount)}
                  </p>
                </div>
              </div>

              <Separator className="bg-border/60" />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Internal Ref:</span>{' '}
                  <span className="font-mono font-medium text-foreground">{booking.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Reason:</span>{' '}
                  <span className="font-medium text-foreground">
                    {booking.statusReason || (booking.status === 'CONFIRMED' ? 'Paid & Verified' : booking.status)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Turnstile Access & Check-In Status */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Turnstile & Access Control
            </h3>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current Access State</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  {booking.checkInState === 'CHECKED_IN' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <LockOpen className="w-4 h-4" /> Checked In & Access Active
                    </span>
                  ) : booking.checkInState === 'CHECKED_OUT' ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Checked Out
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {booking.checkInState?.replace('_', ' ') || ''}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {booking.checkInTime ? `Turnstile check-in logged at ${booking.checkInTime}` : 'Awaiting arrival at security turnstile'}
                </p>
              </div>

              {onCheckInToggle && booking.status === 'CONFIRMED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onCheckInToggle(booking.id)}
                >
                  {booking.checkInState === 'CHECKED_IN' ? 'Force Check-Out' : 'Manual Turnstile Check-In'}
                </Button>
              )}
            </div>
          </section>

          {/* Notes or Special Requests */}
          {booking.notes && (
            <div className="p-3 bg-muted/20 border border-border rounded-lg text-xs">
              <span className="font-semibold text-foreground">Special Instructions:</span>{' '}
              <span className="text-muted-foreground">{booking.notes}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {booking.status === 'CONFIRMED' && onCancelBooking && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  onCancelBooking(booking.id);
                  onClose();
                }}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Reservation
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onSendReminder && booking.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => onSendReminder(booking)}
              >
                <Send className="w-3.5 h-3.5" /> Resend Confirmation
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="text-xs"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

