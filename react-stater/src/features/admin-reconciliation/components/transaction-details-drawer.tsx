import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { TransactionRecord } from '../data/mock-transactions';

interface TransactionDetailsDrawerProps {
  transaction: TransactionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onReconcile: (tx: TransactionRecord) => void;
}

function handleCopy(text: string, label: string) {
  navigator.clipboard?.writeText(text);
  toast.success(`${label} Copied to Clipboard`);
}

export function TransactionDetailsDrawer({
  transaction,
  isOpen,
  onClose,
  onReconcile
}: TransactionDetailsDrawerProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen, transaction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    if (isOpen && transaction) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, transaction, onClose]);

  if (!isOpen || !transaction) return null;

  const handleDownloadReceipt = () => {
    toast.success(`Bank Receipt Generated (PDF)`, {
      description: `Disbursement receipt for #${transaction.id} (${transaction.disbursementBank}) prepared for audit download.`
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Container */}
      <aside
        role='dialog'
        aria-label={`Transaction Details for #${transaction.id}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[640px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Header */}
        <div className='border-b border-border bg-card p-6 select-none shrink-0'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground flex items-center gap-1.5'>
                #{transaction.id}
                <button
                  type='button'
                  onClick={() => handleCopy(transaction.id, 'Transaction ID')}
                  className='text-muted-foreground hover:text-foreground'
                  title='Copy ID'
                  aria-label='Copy Transaction ID'
                >
                  <Copy className='size-3' aria-hidden='true' />
                </button>
              </span>

              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                {transaction.statusBadge}
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Expand to fullscreen'
              >
                <Maximize2 className='size-4' aria-hidden='true' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='size-8 text-muted-foreground hover:text-foreground'
                aria-label='Close drawer'
              >
                <X className='size-4' aria-hidden='true' />
              </Button>
            </div>
          </div>

          <div>
            <h2 className='text-lg font-bold font-heading text-foreground'>
              Financial Reconciliation &amp; Settlement Proof
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {transaction.checkoutMethod}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* SECTION 1: FINANCIAL & SETTLEMENT LEDGER */}
          <section aria-label='Financial Settlement Ledger' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <Receipt className='size-3.5 text-primary' aria-hidden='true' />
                Financial &amp; Settlement Ledger
              </h3>
              <span className='text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-semibold'>
                Reconciled 100%
              </span>
            </div>

            <div className='p-4 rounded-xl border border-border bg-card shadow-2xs space-y-2.5 text-xs'>
              <div className='flex justify-between items-center text-foreground font-medium'>
                <span>Gross Customer Charge</span>
                <span className='font-semibold'>
                  ${transaction.grossChargeUsd.toFixed(2)}{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({transaction.grossChargeVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              <div className='flex justify-between items-center text-indigo-700 dark:text-indigo-400 font-medium'>
                <span className='flex items-center gap-1.5'>
                  NexSpace Platform Commission
                  <span className='text-[10px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded font-bold'>
                    {transaction.platformCommissionPercent}%
                  </span>
                </span>
                <span>
                  -${transaction.platformCommissionUsd.toFixed(2)}{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({transaction.platformCommissionVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              <div className='flex justify-between items-center text-muted-foreground'>
                <span>PayOS Gateway Processing Fee ({transaction.gatewayFeePercent}%)</span>
                <span>
                  -${transaction.gatewayFeeUsd.toFixed(2)}{' '}
                  <span>({transaction.gatewayFeeVnd.toLocaleString()} VND)</span>
                </span>
              </div>

              <div className='pt-2.5 border-t border-border flex justify-between items-baseline'>
                <span className='font-bold text-foreground text-sm'>Net Organizer Payout</span>
                <span className='text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono'>
                  ${transaction.netPayoutUsd.toFixed(2)}{' '}
                  <span className='text-xs text-muted-foreground font-normal'>
                    ({transaction.netPayoutVnd.toLocaleString()} VND)
                  </span>
                </span>
              </div>

              <div className='pt-2 border-t border-border/60 flex items-center justify-between text-[11px]'>
                <span className='text-muted-foreground'>Target Disbursement Account:</span>
                <span className='font-medium text-foreground flex items-center gap-1'>
                  {transaction.disbursementBank}
                  <CheckCircle2 className='size-3 text-emerald-600 dark:text-emerald-400' aria-hidden='true' />
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: GATEWAY & BANKING SETTLEMENT PROOF */}
          <section aria-label='Gateway Settlement Proof' className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
              <ShieldCheck className='size-3.5 text-primary' aria-hidden='true' />
              Gateway &amp; Banking Settlement Proof
            </h3>

            <div className='p-4 rounded-xl border border-border bg-muted/40 space-y-3 text-xs'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <span className='text-[11px] text-muted-foreground'>PayOS Order Code</span>
                  <div className='font-mono font-semibold text-foreground flex items-center gap-1.5 mt-0.5'>
                    <span>{transaction.payOsOrderCode}</span>
                    <button
                      type='button'
                      onClick={() => handleCopy(transaction.payOsOrderCode, 'Order Code')}
                      className='text-muted-foreground hover:text-foreground'
                      aria-label='Copy Order Code'
                    >
                      <Copy className='size-3' aria-hidden='true' />
                    </button>
                  </div>
                </div>
                <div>
                  <span className='text-[11px] text-muted-foreground'>Napas247 Trace No</span>
                  <div className='font-mono font-semibold text-foreground mt-0.5'>{transaction.napasTraceNo}</div>
                </div>
              </div>

              <div className='pt-2 border-t border-border/60'>
                <span className='text-[11px] text-muted-foreground'>Bank Interbank Reference Number</span>
                <div className='font-mono font-bold text-primary mt-0.5'>{transaction.bankRefNumber}</div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60'>
                <div>
                  <span className='text-[11px] text-muted-foreground'>Webhook Ingress Status</span>
                  <div className='font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                    {transaction.webhookLatency}
                  </div>
                </div>
                <div>
                  <span className='text-[11px] text-muted-foreground'>HMAC SHA-256 Signature</span>
                  <div className='font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1'>
                    <CheckCircle2 className='size-3.5' aria-hidden='true' />
                    {transaction.sha256Checksum}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: LINKED BOOKING CONTEXT */}
          <section aria-label='Linked Booking Context' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <FileText className='size-3.5 text-primary' aria-hidden='true' />
                Linked Booking Context
              </h3>
              <Link
                to='/dashboard/admin/bookings'
                search={{ bookingId: transaction.bookingRef }}
                className='text-xs text-primary hover:underline font-semibold flex items-center gap-1'
              >
                <span>View Booking Drawer in A08</span>
                <ExternalLink className='size-3' aria-hidden='true' />
              </Link>
            </div>

            <div className='p-4 rounded-xl border border-border bg-card shadow-2xs space-y-2 text-xs'>
              <div className='flex justify-between py-1 border-b border-border/60'>
                <span className='text-muted-foreground'>Booking Reference:</span>
                <span className='font-mono font-bold text-foreground'>#{transaction.bookingRef}</span>
              </div>
              <div className='flex justify-between py-1 border-b border-border/60'>
                <span className='text-muted-foreground'>Reserved Resource:</span>
                <span className='font-semibold text-foreground'>{transaction.bookingSummary}</span>
              </div>
              <div className='flex justify-between py-1 border-b border-border/60'>
                <span className='text-muted-foreground'>Customer:</span>
                <span className='text-foreground'>{transaction.customerName} ({transaction.customerEmail})</span>
              </div>
              <div className='flex justify-between py-1'>
                <span className='text-muted-foreground'>Organizer Legal Entity:</span>
                <span className='font-medium text-foreground'>{transaction.organizerLegalName}</span>
              </div>
            </div>
          </section>

          {/* SECTION 4: RAW GATEWAY PAYLOAD */}
          <section aria-label='Raw Payload' className='space-y-2'>
            <button
              type='button'
              onClick={() => setShowRawJson((prev) => !prev)}
              className='w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground py-1'
            >
              <span>Raw Gateway Ingress Payload (JSON)</span>
              {showRawJson ? (
                <ChevronUp className='size-4' aria-hidden='true' />
              ) : (
                <ChevronDown className='size-4' aria-hidden='true' />
              )}
            </button>

            {showRawJson && (
              <pre className='p-3.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto border border-border'>
                {JSON.stringify(transaction.rawPayloadJson, null, 2)}
              </pre>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className='border-t border-border bg-card p-4 space-y-3 shrink-0'>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground justify-between'>
            <span className='flex items-center gap-1'>
              <Lock className='size-3 text-muted-foreground' aria-hidden='true' />
              SOC-2 Type II Immutable Ledger Entry
            </span>
            <span className='font-mono'>{transaction.secOpsLedgerHash}</span>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleDownloadReceipt}
              className='flex-1 h-10 text-xs'
            >
              <span>Download Bank Receipt (PDF)</span>
            </Button>
            <Button
              type='button'
              onClick={() => onReconcile(transaction)}
              className='flex-1 h-10 bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs'
            >
              <span>Reconcile Record</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
