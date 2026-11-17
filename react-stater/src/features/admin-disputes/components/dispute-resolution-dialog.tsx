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
import { Gavel } from 'lucide-react';
import { DisputeCase } from '../data/mock-disputes';

interface DisputeResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeCase: DisputeCase | null;
  decisionType: string;
  justification: string;
  onConfirm: () => void;
}

function getDecisionLabel(type: string) {
  switch (type) {
    case 'partial_credit':
      return 'Issue Partial Credit ($22.50 • 50% refund) to Customer';
    case 'dismiss':
      return 'Dismiss Report as Unfounded / Ineligible';
    case 'penalize':
      return 'Penalize Space Partner (SLA Breach Deduct + Warning)';
    default:
      return 'Adjudicate Resolution';
  }
}

export function DisputeResolutionDialog({
  open,
  onOpenChange,
  disputeCase,
  decisionType,
  justification,
  onConfirm
}: DisputeResolutionDialogProps) {
  if (!disputeCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-2 mb-1'>
            <div className='size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
              <Gavel className='size-4' />
            </div>
            <DialogTitle className='text-base font-bold'>
              Confirm Dispute Adjudication
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            You are about to record an immutable resolution decision for case {disputeCase.caseNumber}. This action is logged under SOC-2 compliance.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2 text-xs'>
          <div className='p-3 rounded-lg bg-muted/60 space-y-1.5 border border-border'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Case ID:</span>
              <span className='font-mono font-semibold'>{disputeCase.caseNumber}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Reporter:</span>
              <span className='font-medium'>{disputeCase.reporterName}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Decision Mode:</span>
              <span className='font-bold text-foreground'>{getDecisionLabel(decisionType)}</span>
            </div>
          </div>

          <div>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
              Legal & Audit Justification
            </span>
            <div className='p-2.5 rounded bg-background border border-border text-foreground text-[11px] leading-relaxed italic'>
              "{justification}"
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
            Review Changes
          </Button>
          <Button
            type='button'
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className='text-xs h-9 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground'
          >
            Submit Binding Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
