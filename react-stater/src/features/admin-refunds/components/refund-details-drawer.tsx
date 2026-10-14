import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Ban,
  Timer,
  CheckCircle2,
  Lock,
  ZoomIn,
  Quote
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RefundRecord } from '../data/mock-refunds';
import { RefundActionDialog } from './refund-action-dialog';

interface RefundDetailsDrawerProps {
  refund: RefundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (refund: RefundRecord, note: string) => void;
  onReject: (refund: RefundRecord, note: string) => void;
}

export function RefundDetailsDrawer({
  refund,
  isOpen,
  onClose,
  onApprove,
  onReject
}: RefundDetailsDrawerProps) {
  const [adminNote, setAdminNote] = useState<string>(
    refund?.adminResolutionNote ||
      'Approved under Clause 4.2 (Facility defect confirmed by building operations log #LOG-442).'
  );
  const [actionModalType, setActionModalType] = useState<'approve' | 'reject' | null>(null);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);

  if (!isOpen || !refund) return null;

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
        aria-label={`Refund Claim Details for ${refund.id}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[600px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Header */}
        <div className='border-b border-border bg-card p-6 select-none shrink-0'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-base font-bold text-foreground'>
                {refund.id}
              </span>

              {refund.status === 'pending' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'>
                  <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                  Pending Adjudication
                </span>
              )}
              {refund.status === 'processed' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'>
                  <span className='size-1.5 rounded-full bg-emerald-500' />
                  Processed & Disbursed
                </span>
              )}
              {refund.status === 'rejected' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40'>
                  <span className='size-1.5 rounded-full bg-red-500' />
                  Claim Rejected
                </span>
              )}
            </div>

            <button
              type='button'
              onClick={onClose}
              className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors'
              title='Close Drawer (Esc)'
            >
              <X className='size-5' />
            </button>
          </div>

          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1'>
              <Timer className='size-3.5' />
              SLA: {refund.slaRemaining}
            </span>
            <span>•</span>
            <span>{refund.triggeredAt}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* Section 1: Booking & Context Summary */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Booking & Context Summary
              </span>
              <Link
                to='/dashboard/admin/bookings'
                search={{ bookingId: refund.bookingRef.replace('#', '') }}
                className='text-[11px] text-primary hover:underline font-semibold flex items-center gap-1'
              >
                <span>View Original Booking ({refund.bookingRef})</span>
                <ExternalLink className='size-3' />
              </Link>
            </div>

            <div className='bg-muted/50 border border-border rounded-lg p-3.5 space-y-2.5 text-xs'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>Customer & Account</span>
                  <span className='font-semibold text-foreground'>{refund.customerName}</span>
                  <span className='text-[11px] text-muted-foreground block'>
                    {refund.customerCompany || refund.customerEmail}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>Reserved Space</span>
                  <span className='font-semibold text-foreground'>{refund.workspaceHub}</span>
                  <span className='text-[11px] text-muted-foreground block'>{refund.spaceDetails}</span>
                </div>
              </div>

              <div className='border-t border-border pt-2 grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>Timeline Context</span>
                  <div className='text-foreground font-medium'>Slot: Today, Scheduled</div>
                  <div className='text-amber-600 dark:text-amber-400 font-medium text-[11px]'>
                    Claim: {refund.triggeredAt}
                  </div>
                </div>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>Applicable Refund Policy</span>
                  <span className='inline-block font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] mt-0.5'>
                    {refund.policyClause}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Claim Reason & Attached Evidence */}
          <div className='space-y-3'>
            <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Customer Claim Reason & Verification
            </span>

            {/* Customer Statement Block */}
            <div className='p-3.5 rounded-lg border border-border bg-card text-xs leading-relaxed space-y-1.5'>
              <div className='flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]'>
                <Quote className='size-3.5' />
                Customer Incident Statement
              </div>
              <p className='italic text-foreground bg-muted/40 p-2.5 rounded border border-border'>
                "{refund.customerStatement}"
              </p>
            </div>

            {/* Evidence Preview Card */}
            {refund.evidence && (
              <div className='border border-border rounded-lg p-3 bg-card'>
                <div className='flex items-start gap-3'>
                  {refund.evidence.thumbnailUrl ? (
                    <button
                      type='button'
                      onClick={() => setPhotoZoomOpen(true)}
                      aria-label='Zoom incident photograph'
                      className='relative size-24 rounded-md overflow-hidden bg-muted border border-border shrink-0 group cursor-pointer text-left p-0'
                      title='Click to zoom photograph'
                    >
                      <img
                        src={refund.evidence.thumbnailUrl}
                        alt='Customer incident evidence'
                        className='w-full h-full object-cover'
                      />
                      <div className='absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white'>
                        <ZoomIn className='size-4' />
                      </div>
                    </button>
                  ) : null}

                  <div className='flex-1 text-xs space-y-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold'>
                        <CheckCircle2 className='size-3' />
                        {refund.evidence.verificationBadge}
                      </span>
                      <span className='text-[10px] text-muted-foreground'>
                        EXIF: {refund.evidence.exifTimestamp}
                      </span>
                    </div>

                    <div className='text-foreground font-medium text-[11px] leading-tight pt-1'>
                      {refund.evidence.description}
                    </div>

                    {refund.evidence.onsiteTicketLog && (
                      <div className='text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5'>
                        <CheckCircle2 className='size-3' />
                        <span>{refund.evidence.onsiteTicketLog}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Financial Settlement Calculation */}
          <div className='space-y-2'>
            <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Automated Refund Settlement Calculation
            </span>

            <div className='bg-muted/50 border border-border rounded-xl p-4 text-xs space-y-2.5'>
              <div className='flex items-center justify-between text-muted-foreground'>
                <span>Original Customer Reservation Amount:</span>
                <span className='font-mono font-semibold text-foreground'>
                  ${refund.originalPaidUsd.toFixed(2)}{' '}
                  <span className='text-[10px] text-muted-foreground'>
                    ({(refund.originalPaidVnd / 1000).toLocaleString()}k VND)
                  </span>
                </span>
              </div>

              <div className='flex items-center justify-between text-muted-foreground'>
                <span>Gateway & Platform Fee Adjustment:</span>
                <span className='font-mono text-red-500 font-medium'>
                  -${refund.gatewayFeeDeductionUsd.toFixed(2)}{' '}
                  <span className='text-[10px] text-muted-foreground'>
                    ({(refund.gatewayFeeDeductionVnd / 1000).toLocaleString()}k VND)
                  </span>
                </span>
              </div>

              <div className='border-t border-border pt-2.5 flex items-center justify-between'>
                <div>
                  <div className='font-bold text-foreground text-sm'>Net Refund to Customer</div>
                  <div className='text-[10px] text-muted-foreground'>
                    Direct reversal to original payment method
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-mono font-bold text-lg text-primary leading-none'>
                    ${refund.calculatedRefundUsd.toFixed(2)}
                  </div>
                  <div className='font-mono text-[11px] text-muted-foreground mt-0.5'>
                    {refund.calculatedRefundVnd.toLocaleString()} VND
                  </div>
                </div>
              </div>

              {/* Escrow Status Callout */}
              <div className='mt-2 pt-2 border-t border-dashed border-border flex items-center gap-2 text-[11px] text-muted-foreground bg-card p-2 rounded border border-border'>
                <ShieldCheck className='size-4 text-emerald-600 shrink-0' />
                <span>
                  PayOS Escrow Reserve:{' '}
                  <strong className='text-foreground'>{refund.escrowReserveCode}</strong>. Ready for instant webhook payout.
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Mandatory Admin Resolution Note Input */}
          <div className='space-y-1.5'>
            <label
              htmlFor='refund-admin-note'
              className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between'
            >
              <span>Mandatory Admin Resolution Note (Audit Trail)</span>
              <span className='text-[10px] text-muted-foreground'>SOC-2 Compliant</span>
            </label>
            <textarea
              id='refund-admin-note'
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={refund.status !== 'pending'}
              className='w-full text-xs p-3 bg-card border border-input rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60 resize-none'
              rows={3}
              placeholder='Enter reason for approval or rejection. This message will be sent to customer and operator...'
            />
            <div className='text-[10px] text-muted-foreground'>
              Note will be dispatched via customer webhook and appended to Hub Operator invoice cycle.
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className='p-4 border-t border-border bg-card select-none space-y-2 shrink-0'>
          {refund.status === 'pending' ? (
            <div className='flex items-center justify-between gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setActionModalType('reject')}
                className='border-red-500/40 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs h-9 font-semibold flex items-center gap-1.5'
              >
                <Ban className='size-4' />
                Reject Claim
              </Button>

              <Button
                type='button'
                onClick={() => setActionModalType('approve')}
                className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold flex items-center justify-center gap-2 shadow-xs'
              >
                <CheckCircle2 className='size-4' />
                Approve ${refund.calculatedRefundUsd.toFixed(2)} Refund
              </Button>
            </div>
          ) : (
            <div className='p-2 rounded bg-muted/60 border border-border text-center text-xs text-muted-foreground'>
              This refund record is marked as <strong className='text-foreground'>{refund.statusBadge}</strong> and is locked under SOC-2 compliance.
            </div>
          )}

          <div className='text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1'>
            <Lock className='size-3 text-emerald-600' />
            <span>Reversals cryptographically authorized via PayOS Escrow Webhook. Immutable SOC-2 Log.</span>
          </div>
        </div>
      </aside>

      {/* Confirmation Dialog */}
      <RefundActionDialog
        open={actionModalType !== null}
        onOpenChange={(open) => !open && setActionModalType(null)}
        actionType={actionModalType || 'approve'}
        refund={refund}
        adminNote={adminNote}
        onConfirm={() => {
          if (actionModalType === 'approve') {
            onApprove(refund, adminNote);
          } else if (actionModalType === 'reject') {
            onReject(refund, adminNote);
          }
        }}
      />

      {/* Photo Zoom Modal */}
      {refund.evidence?.thumbnailUrl && (
        <Dialog open={photoZoomOpen} onOpenChange={setPhotoZoomOpen}>
          <DialogContent className='sm:max-w-2xl p-2'>
            <div className='rounded-lg overflow-hidden'>
              <img
                src={refund.evidence.thumbnailUrl}
                alt='High resolution evidence inspect'
                className='w-full h-auto max-h-[70vh] object-contain'
              />
              <div className='p-3 bg-card border-t border-border text-xs'>
                <div className='font-semibold text-foreground'>{refund.evidence.description}</div>
                <div className='text-muted-foreground text-[11px]'>{refund.evidence.onsiteTicketLog}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
