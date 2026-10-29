import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommissionActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleCode: string;
  ruleTitle: string;
  ratePercentage: number;
  onConfirmSuccess: () => void;
}

export function CommissionActionDialog({
  open,
  onOpenChange,
  ruleCode,
  ruleTitle,
  ratePercentage,
  onConfirmSuccess
}: CommissionActionDialogProps) {
  const [securityPin, setSecurityPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onOpenChange(false);
      onConfirmSuccess();
      toast.success('Fee Rule Activated on Production Ledger', {
        description: `Rule ${ruleCode} updated to ${ratePercentage}%. Enacted for checkout intents starting immediately (T+0).`
      });
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[460px] bg-card text-card-foreground border-border'>
        <DialogHeader>
          <div className='size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2'>
            <KeyRound className='size-5' />
          </div>
          <DialogTitle className='text-base font-bold text-foreground'>
            SecOps HSM 2FA Authorization
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Modifying a production monetization rule increments the platform policy version and signs the new rate with your HSM hardware key.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          {/* Summary Box */}
          <div className='p-3 rounded-lg bg-muted/60 border border-border text-xs space-y-1.5'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Target Rule:</span>
              <span className='font-mono font-bold text-foreground'>{ruleCode}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Rule Title:</span>
              <span className='font-medium text-foreground'>{ruleTitle}</span>
            </div>
            <div className='flex justify-between border-t border-border pt-1.5'>
              <span className='text-muted-foreground'>New Take-Rate:</span>
              <span className='font-mono font-bold text-primary text-sm'>
                {ratePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* HSM Fingerprint notice */}
          <div className='p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2'>
            <ShieldAlert className='size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
            <span>
              Hardware Key: <strong className='font-mono'>YubiKey-HSM-5C (Slot 0x02)</strong>. Future transactions only; zero historical recalculation.
            </span>
          </div>

          {/* PIN Input */}
          <div className='space-y-1.5'>
            <label
              htmlFor='hsm-security-pin'
              className='text-xs font-semibold text-foreground block'
            >
              Enter Super Admin Security Token
            </label>
            <input
              id='hsm-security-pin'
              type='password'
              maxLength={6}
              placeholder='••••••'
              value={securityPin}
              onChange={(e) => setSecurityPin(e.target.value)}
              className='w-full text-center tracking-widest font-mono text-lg h-10 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none'
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='text-xs'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting || securityPin.length < 4}
              className='text-xs font-bold gap-1.5'
            >
              <CheckCircle2 className='size-4' />
              {isSubmitting ? 'Signing Ledger...' : 'Authorize & Sign Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
