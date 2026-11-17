import React from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Wrench,
  Briefcase,
  Copy,
  Check,
  Send,
  XCircle
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
import { GanttResource, GanttBookingBlock, GanttBlockType } from '../types';

interface ScheduleBlockDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resource: GanttResource | null;
  block: GanttBookingBlock | null;
  onSendPass?: (block: GanttBookingBlock) => void;
  onCancelBlock?: (blockId: string) => void;
}

function getBadge(type: GanttBlockType, statusLabel: string) {
  switch (type) {
    case 'CONFIRMED':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 font-semibold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmed & Active
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 font-semibold text-xs">
          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Payment
        </Badge>
      );
    case 'MAINTENANCE':
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 font-semibold text-xs">
          <Wrench className="w-3.5 h-3.5 mr-1" /> {statusLabel || 'Maintenance'}
        </Badge>
      );
    case 'VIP':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60 font-semibold text-xs">
          <Briefcase className="w-3.5 h-3.5 mr-1" /> VIP Corporate
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function ScheduleBlockDetailDialog({
  isOpen,
  onClose,
  resource,
  block,
  onSendPass,
  onCancelBlock
}: ScheduleBlockDetailDialogProps) {
  const [copied, setCopied] = React.useState(false);

  if (!block || !resource) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(block.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const durationHrs = block.endHour - block.startHour;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-sm font-bold text-foreground">
                  {block.bookingCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyCode}
                  aria-label="Copy code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                {getBadge(block.type, block.statusLabel)}
              </div>
              <DialogTitle className="text-lg font-bold">
                {block.guestName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {block.companyOrNote ? `${block.companyOrNote} • ` : ''}Scheduled on {resource.code}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Resource & Time Schedule */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Allocated Unit</span>
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {resource.code}
              </p>
              <p className="text-muted-foreground text-[11px]">{resource.zone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Time Window</span>
              <p className="font-bold text-foreground flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {block.startTime} — {block.endTime}
              </p>
              <p className="text-muted-foreground text-[11px]">{durationHrs} Hours duration</p>
            </div>
          </div>

          {/* Guest or Booking Audit details */}
          {block.type !== 'MAINTENANCE' && (
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold block">
                Verification & Access Audit
              </span>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Guest Contact:</span>
                <span className="font-medium text-foreground">{block.guestName}</span>
              </div>

              {block.checkedInTime && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Turnstile IoT Scan:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Logged at {block.checkedInTime}
                  </span>
                </div>
              )}

              {block.remainingTime && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">PayOS Hold Expiry:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {block.remainingTime}
                  </span>
                </div>
              )}

              {block.amount && (
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Settlement Value:</span>
                  <span className="font-bold text-foreground font-mono">
                    ${block.amount.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Maintenance note */}
          {block.type === 'MAINTENANCE' && (
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold block">
                Facility Maintenance Note
              </span>
              <p className="text-foreground">
                Assigned to: <strong className="font-semibold">{block.companyOrNote || 'Facility Operations Team'}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Auto-blockouts prevent overlapping guest reservations during sanitization, HVAC checkups, and routine electrical servicing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            {onCancelBlock && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  onCancelBlock(block.id);
                  onClose();
                }}
              >
                <XCircle className="w-3.5 h-3.5" /> Release Slot
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSendPass && block.type !== 'MAINTENANCE' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => onSendPass(block)}
              >
                <Send className="w-3.5 h-3.5" /> Resend Pass
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
