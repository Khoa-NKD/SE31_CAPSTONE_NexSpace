import React from 'react';
import { CalendarClock, CheckCircle, Receipt, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function handleAuditLogClick() {
  toast.info('HSM Audit Log Explorer', {
    description: 'Viewing cryptographic immutable ledger revisions for Policy v2.4.1.'
  });
}

function handleTaxInfoClick() {
  toast.info('Vietnamese Tax Compliance', {
    description: 'Decree 123/2020/ND-CP compliance active. Automated digital VAT e-invoicing integrated via authorized T-VAN provider.'
  });
}

export function StatutoryComplianceCard() {

  return (
    <div className='flex flex-col gap-6 h-full'>
      {/* Card 1: Scheduled Fee Policy Revisions */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm'>
        <div className='flex items-center gap-2 mb-3'>
          <CalendarClock className='size-5 text-primary' />
          <h3 className='text-sm font-bold text-foreground'>
            Scheduled Fee Policy Revisions
          </h3>
        </div>

        <div className='p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3 flex items-start gap-3'>
          <CheckCircle className='size-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0' />
          <div>
            <p className='text-xs font-bold text-emerald-950 dark:text-emerald-200'>
              No pending rate revisions scheduled
            </p>
            <p className='text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed'>
              All tier-1 organizer contracts are locked through Q2 2026. Any rate adjustment mandates a 30-day notice and SecOps HSM authorization.
            </p>
          </div>
        </div>

        <div className='flex items-center justify-between pt-2 text-xs'>
          <span className='text-muted-foreground font-mono'>
            Policy Version: v2.4.1 (Enforced)
          </span>
          <Button
            variant='link'
            size='sm'
            onClick={handleAuditLogClick}
            className='h-auto p-0 text-primary font-semibold inline-flex items-center gap-1 hover:underline text-xs'
          >
            <span>View Audit Log</span>
            <ArrowRight className='size-3.5' />
          </Button>
        </div>
      </div>

      {/* Card 2: Tax Compliance & Statutory VAT */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <Receipt className='size-5 text-muted-foreground' />
            <h3 className='text-sm font-bold text-foreground'>
              Tax Compliance &amp; Statutory VAT
            </h3>
          </div>
          <span className='inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border'>
            Decree 123/2020/ND-CP
          </span>
        </div>

        <div className='grid grid-cols-2 gap-3 mb-3'>
          <div className='p-3 rounded-lg bg-muted/50 border border-border'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              VAT Take Rate
            </span>
            <p className='text-xl font-extrabold text-foreground mt-0.5'>8.0%</p>
            <span className='text-[11px] text-muted-foreground'>e-Invoice Standard</span>
          </div>

          <div className='p-3 rounded-lg bg-muted/50 border border-border'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
              GDT Sync Status
            </span>
            <p className='text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5'>
              Real-time
            </p>
            <span className='text-[11px] text-muted-foreground'>General Dept of Taxation</span>
          </div>
        </div>

        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <span className='size-2 rounded-full bg-emerald-500' />
            <span>VietQR e-invoices reconciled daily</span>
          </div>
          <button
            type='button'
            onClick={handleTaxInfoClick}
            aria-label='View statutory tax compliance details'
            className='text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted'
          >
            <Info className='size-4' />
          </button>
        </div>
      </div>
    </div>
  );
}
