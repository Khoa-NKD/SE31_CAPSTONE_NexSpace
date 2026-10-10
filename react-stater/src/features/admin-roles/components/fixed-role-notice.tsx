import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function FixedRoleNotice() {
  const [openSpec, setOpenSpec] = useState(false);

  return (
    <>
      <div className='mb-6 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-2xs'>
        <div className='mt-0.5 p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0'>
          <ShieldAlert className='size-5' />
        </div>

        <div className='flex-1 text-xs leading-relaxed'>
          <div className='font-bold text-blue-950 dark:text-blue-100 text-sm mb-0.5'>
            Fixed Role Architecture Policy
          </div>
          <p className='text-blue-900 dark:text-blue-200'>
            <strong className='font-semibold text-blue-950 dark:text-blue-100'>Notice:</strong> NexSpace
            enforces 3 immutable platform business roles (<code className='font-mono font-medium bg-blue-100/60 dark:bg-blue-900/40 px-1 py-0.5 rounded'>Customer</code>, <code className='font-mono font-medium bg-blue-100/60 dark:bg-blue-900/40 px-1 py-0.5 rounded'>Organizer</code>, <code className='font-mono font-medium bg-blue-100/60 dark:bg-blue-900/40 px-1 py-0.5 rounded'>Administrator</code>).
            Custom roles cannot be created; administrators may only modify permission mappings and functional scope boundaries.
          </p>
        </div>

        <div className='self-center shrink-0'>
          <button
            type='button'
            onClick={() => setOpenSpec(true)}
            className='text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap'
          >
            Read Governance Spec
          </button>
        </div>
      </div>

      <Dialog open={openSpec} onOpenChange={setOpenSpec}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ShieldAlert className='size-5 text-indigo-600' />
              <span>NexSpace Role Architecture Specification</span>
            </DialogTitle>
            <DialogDescription className='pt-2 text-xs text-muted-foreground'>
              Governance rules governing tenant authentication and access scoping.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 text-xs text-foreground bg-muted/40 p-4 rounded-lg border border-border'>
            <div>
              <h4 className='font-semibold'>1. Customer Role (Nomad / Enterprise Client)</h4>
              <p className='text-muted-foreground mt-0.5'>
                Authenticated individuals booking workspace hours, day passes, or dedicated meeting suites.
              </p>
            </div>
            <div>
              <h4 className='font-semibold'>2. Space Organizer (Venue Host / Landlord)</h4>
              <p className='text-muted-foreground mt-0.5'>
                Verified commercial real estate partners operating hubs, meeting rooms, and desk inventories.
              </p>
            </div>
            <div>
              <h4 className='font-semibold'>3. Platform Administrator (SecOps / Super Admin)</h4>
              <p className='text-muted-foreground mt-0.5'>
                Root-level security tier with hardware token enforcement and full audit traceability.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenSpec(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
