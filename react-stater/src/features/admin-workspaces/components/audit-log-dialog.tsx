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
import { History } from 'lucide-react';
import { ModerationDecisionRecord } from '../data/mock-workspaces';

interface AuditLogDialogProps {
  record: ModerationDecisionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogDialog({ record, isOpen, onClose }: AuditLogDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md bg-card border border-border shadow-xl'>
        <DialogHeader className='space-y-2'>
          <div className='w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center'>
            <History className='size-5' aria-hidden='true' />
          </div>
          <DialogTitle className='text-base font-bold font-heading text-foreground'>
            Workspace Moderation Audit Trail
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Inspection log for {record.workspaceName} ({record.workspaceId})
          </DialogDescription>
        </DialogHeader>

        <div className='bg-muted/50 border border-border rounded-lg p-4 space-y-3 text-xs'>
          <div className='flex justify-between items-center pb-2 border-b border-border'>
            <span className='text-muted-foreground'>Decision Action:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                record.actionStatus === 'approved' || record.actionStatus === 'reactivated'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : record.actionStatus === 'suspended'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : record.actionStatus === 'rejected'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              {record.action}
            </span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Organizer:</span>
            <span className='font-medium text-foreground'>{record.organizerLegalEntity}</span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Metro Zone:</span>
            <span className='font-medium text-foreground'>{record.metroZone}</span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Admin Handler:</span>
            <div className='flex items-center gap-1.5'>
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${record.adminHandler.avatarBgClass}`}>
                {record.adminHandler.initials}
              </span>
              <span className='font-medium text-foreground'>{record.adminHandler.name} ({record.adminHandler.role})</span>
            </div>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Recorded Time:</span>
            <span className='font-mono text-muted-foreground'>{record.timestampExact}</span>
          </div>

          <div className='pt-2 border-t border-border'>
            <span className='text-muted-foreground block mb-1'>Verification Notes:</span>
            <p className='text-foreground bg-card p-2.5 rounded border border-border italic leading-relaxed'>
              "{record.auditTrailNotes}"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' size='sm' onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
