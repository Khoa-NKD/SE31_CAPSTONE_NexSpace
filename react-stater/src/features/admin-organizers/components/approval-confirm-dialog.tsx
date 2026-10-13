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
import { CheckCircle2, Lock } from 'lucide-react';
import { VerificationApplication } from '../data/mock-organizers';

interface ApprovalConfirmDialogProps {
  application: VerificationApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApprovalConfirmDialog({
  application,
  isOpen,
  onClose,
  onConfirm
}: ApprovalConfirmDialogProps) {
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md bg-card border border-border shadow-xl'>
        <DialogHeader className='space-y-2'>
          <div className='w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center'>
            <CheckCircle2 className='size-6' aria-hidden='true' />
          </div>
          <DialogTitle className='text-lg font-bold font-heading text-foreground'>
            Approve Organizer &amp; Authorize Listing
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground leading-relaxed'>
            You are authorizing <strong className='text-foreground'>{application.legalName}</strong> (#{application.id}) as a fully verified partner organizer on NexSpace.
          </DialogDescription>
        </DialogHeader>

        <div className='bg-muted/60 border border-border rounded-lg p-3.5 space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Tax Code (MST):</span>
            <span className='font-mono font-bold text-foreground'>{application.taxCode}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Legal Representative:</span>
            <span className='font-medium text-foreground'>{application.legalRepresentative}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Compliance Status:</span>
            <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>National Portal Active (100% Passed)</span>
          </div>
        </div>

        <div className='flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border'>
          <Lock className='size-3.5 text-primary shrink-0' aria-hidden='true' />
          <span>Action will be cryptographically logged to the compliance ledger with HSM session key.</span>
        </div>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button variant='outline' size='sm' onClick={onClose}>
            Cancel
          </Button>
          <Button
            size='sm'
            onClick={onConfirm}
            className='bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs'
          >
            Confirm &amp; Authorize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
