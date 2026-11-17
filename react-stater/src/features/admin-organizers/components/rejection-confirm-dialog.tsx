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
import { AlertTriangle } from 'lucide-react';
import { VerificationApplication } from '../data/mock-organizers';

interface RejectionConfirmDialogProps {
  application: VerificationApplication | null;
  rejectionReason: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RejectionConfirmDialog({
  application,
  rejectionReason,
  isOpen,
  onClose,
  onConfirm
}: RejectionConfirmDialogProps) {
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md bg-card border border-border shadow-xl'>
        <DialogHeader className='space-y-2'>
          <div className='w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center'>
            <AlertTriangle className='size-6' aria-hidden='true' />
          </div>
          <DialogTitle className='text-lg font-bold font-heading text-foreground'>
            Reject &amp; Request Re-submission
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground leading-relaxed'>
            You are returning application <strong className='text-foreground'>#{application.id}</strong> ({application.legalName}) to the applicant with required corrections.
          </DialogDescription>
        </DialogHeader>

        <div className='bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg p-3.5 space-y-1.5 text-xs'>
          <span className='font-semibold text-rose-800 dark:text-rose-300 block'>
            Correction Notice to Applicant:
          </span>
          <p className='text-rose-700 dark:text-rose-400 italic bg-card/60 p-2 rounded border border-rose-200/60 dark:border-rose-800/60'>
            "{rejectionReason || 'Documentation does not meet platform verification compliance standards. Please re-upload verified legal certificates.'}"
          </p>
        </div>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button variant='outline' size='sm' onClick={onClose}>
            Cancel
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={onConfirm}
            className='bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs'
          >
            Confirm Rejection Notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
