import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { RefundRecord } from '../data/mock-refunds';

interface RefundActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'approve' | 'reject';
  refund: RefundRecord | null;
  adminNote: string;
  onConfirm: () => void;
}

export function RefundActionDialog({
  open,
  onOpenChange,
  actionType,
  refund,
  adminNote,
  onConfirm
}: RefundActionDialogProps) {
  if (!refund) return null;

  const isApprove = actionType === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-2 mb-1'>
            {isApprove ? (
              <div className='size-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center'>
                <ShieldCheck className='size-5' />
              </div>
            ) : (
              <div className='size-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center'>
                <AlertTriangle className='size-5' />
              </div>
            )}
            <DialogTitle className='text-base font-bold'>
              {isApprove ? 'Confirm Refund Approval' : 'Confirm Claim Rejection'}
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            {isApprove
              ? `You are about to authorize an escrow refund of $${refund.calculatedRefundUsd.toFixed(2)} to ${refund.customerName} for claim ${refund.id}.`
              : `You are rejecting claim ${refund.id} submitted by ${refund.customerName}. No disbursement will be initiated.`}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2 text-xs'>
          <div className='p-3 rounded-lg bg-muted/60 space-y-1.5 border border-border'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Booking Reference:</span>
              <span className='font-mono font-semibold'>{refund.bookingRef}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Customer:</span>
              <span className='font-medium'>{refund.customerName}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Original Paid:</span>
              <span className='font-mono'>${refund.originalPaidUsd.toFixed(2)}</span>
            </div>
            <div className='flex justify-between border-t border-border pt-1 font-bold'>
              <span>{isApprove ? 'Net Escrow Payout:' : 'Disbursement Amount:'}</span>
              <span className={isApprove ? 'text-emerald-600' : 'text-muted-foreground'}>
                {isApprove ? `$${refund.calculatedRefundUsd.toFixed(2)}` : '$0.00'}
              </span>
            </div>
          </div>

          <div>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
              Recorded Admin Justification
            </span>
            <div className='p-2.5 rounded bg-background border border-border text-foreground italic text-[11px]'>
              "{adminNote || 'No custom note provided. Default SOC-2 audit resolution record applied.'}"
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='text-xs h-9'
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant={isApprove ? 'default' : 'destructive'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className='text-xs h-9 font-semibold'
          >
            {isApprove ? `Authorize $${refund.calculatedRefundUsd.toFixed(2)} Refund` : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
