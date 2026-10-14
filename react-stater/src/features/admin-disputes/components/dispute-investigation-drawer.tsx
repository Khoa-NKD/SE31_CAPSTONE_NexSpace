import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Shield,
  Gavel,
  Lock,
  Terminal,
  User,
  Store,
  CheckCircle2,
  SignalZero,
  ZoomIn
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DisputeCase, DisputeEvidenceItem } from '../data/mock-disputes';
import { DisputeResolutionDialog } from './dispute-resolution-dialog';
import { EvidenceZoomDialog } from './evidence-zoom-dialog';

interface DisputeInvestigationDrawerProps {
  disputeCase: DisputeCase | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitResolution: (disputeCase: DisputeCase, decision: string, justification: string) => void;
}

export function DisputeInvestigationDrawer({
  disputeCase,
  isOpen,
  onClose,
  onSubmitResolution
}: DisputeInvestigationDrawerProps) {
  if (!isOpen || !disputeCase) return null;

  return (
    <DisputeInvestigationDrawerContent
      key={disputeCase.id}
      disputeCase={disputeCase}
      onClose={onClose}
      onSubmitResolution={onSubmitResolution}
    />
  );
}

function DisputeInvestigationDrawerContent({
  disputeCase,
  onClose,
  onSubmitResolution
}: {
  disputeCase: DisputeCase;
  onClose: () => void;
  onSubmitResolution: (disputeCase: DisputeCase, decision: string, justification: string) => void;
}) {
  const [selectedDecision, setSelectedDecision] = useState<string>(
    disputeCase.adjudicationDecision || 'partial_credit'
  );
  const [justification, setJustification] = useState<string>(
    disputeCase.resolutionJustification ||
      'Verified SLA breach under Terms Clause 8.3 (Network reliability > 99.5%). 50% booking credit ($22.50) awarded to customer David Pham, funded via Acme Coworking monthly payout deduction.'
  );
  const [resolutionConfirmOpen, setResolutionConfirmOpen] = useState(false);
  const [zoomEvidence, setZoomEvidence] = useState<DisputeEvidenceItem | null>(null);

  const handleEscalateLegal = () => {
    toast.error('Escalated to SecOps Legal (Simulated)', {
      description: `Case ${disputeCase.caseNumber} dispatched to platform legal compliance counsel.`
    });
  };

  const handleValidateAndSubmit = () => {
    if (justification.trim().length < 20) {
      toast.warning('Justification Incomplete', {
        description: 'SOC-2 audit requires at least 20 characters of documented legal rationale.'
      });
      return;
    }
    setResolutionConfirmOpen(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Container (640px) */}
      <aside
        role='dialog'
        aria-label={`Investigation Panel for ${disputeCase.caseNumber}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[640px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Drawer Header */}
        <div className='p-6 border-b border-border bg-card shrink-0 select-none'>
          {/* Badges row */}
          <div className='flex items-center justify-between mb-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground'>
                CASE {disputeCase.caseNumber}
              </span>

              {disputeCase.severity === 'critical' && (
                <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'>
                  <span className='size-1.5 rounded-full bg-red-500' />
                  Critical / Level 1
                </span>
              )}
              {disputeCase.severity === 'high' && (
                <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'>
                  <span className='size-1.5 rounded-full bg-amber-500' />
                  High Priority
                </span>
              )}

              <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'>
                <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                {disputeCase.statusLabel}
              </span>
            </div>

            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={onClose}
                className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors'
                title='Close Panel (Esc)'
              >
                <X className='size-5' />
              </button>
            </div>
          </div>

          <h2 className='text-lg font-bold text-foreground leading-snug'>
            {disputeCase.title}
          </h2>
          <p className='text-xs text-muted-foreground mt-1'>
            Reported by <span className='font-medium text-foreground'>{disputeCase.reporterName} ({disputeCase.reporterRole})</span> • Assigned Moderator:{' '}
            <span className='font-medium text-foreground'>{disputeCase.assignedModerator}</span>
          </p>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6 bg-muted/20'>
          {/* 1. Customer Incident Description Card */}
          <div className='bg-card p-4 rounded-lg border border-border shadow-xs space-y-2'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-[11px] uppercase tracking-wider text-muted-foreground font-bold'>
                CUSTOMER INCIDENT STATEMENT
              </span>
              <span className='font-mono text-[11px] text-muted-foreground'>
                {disputeCase.submittedAtFormatted}
              </span>
            </div>
            <div className='p-3 bg-muted/50 rounded border-l-4 border-red-500 text-foreground text-xs italic leading-relaxed'>
              "{disputeCase.customerStatement}"
            </div>
          </div>

          {/* 2. Attached Evidence & Telemetry */}
          <div className='bg-card p-4 rounded-lg border border-border shadow-xs space-y-3'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-[11px] uppercase tracking-wider text-muted-foreground font-bold'>
                ATTACHED EVIDENCE & TELEMETRY ({disputeCase.evidenceFiles.length} FILES)
              </span>
              <span className='text-[11px] text-primary font-semibold flex items-center gap-0.5'>
                Click card to inspect zoom
              </span>
            </div>

            {disputeCase.evidenceFiles.length === 0 ? (
              <div className='p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded border border-dashed border-border'>
                No external telemetry or images attached to this initial report.
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {disputeCase.evidenceFiles.map((ev) => (
                  <button
                    type='button'
                    key={ev.id}
                    onClick={() => setZoomEvidence(ev)}
                    aria-label={`View evidence details for ${ev.title}`}
                    className='group relative w-full text-left rounded-lg border border-border overflow-hidden bg-muted/40 hover:border-primary transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary'
                  >
                    {ev.type === 'telemetry' && ev.telemetryData ? (
                      <div className='p-3 bg-slate-950 text-white space-y-2 text-xs font-mono'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1'>
                            <SignalZero className='size-3' />
                            {ev.title}
                          </span>
                          <span className='px-1 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px]'>
                            {ev.badge}
                          </span>
                        </div>
                        <div className='py-2 text-center border-y border-white/10'>
                          <div className='text-base font-extrabold text-red-400'>
                            {ev.telemetryData.speedDown}
                          </div>
                          <div className='text-[10px] text-white/60'>
                            {ev.telemetryData.speedUp} • {ev.telemetryData.ping}
                          </div>
                        </div>
                        <div className='flex items-center justify-between text-[10px] text-white/60'>
                          <span>Hash: {ev.verifiedHash}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                      </div>
                    ) : ev.type === 'photo' && ev.imageUrl ? (
                      <div>
                        <div className='h-28 overflow-hidden bg-slate-900'>
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          />
                        </div>
                        <div className='p-2 bg-card border-t border-border'>
                          <div className='flex items-center justify-between text-[10px] font-bold text-foreground'>
                            <span className='truncate'>{ev.title}</span>
                            <span className='px-1 bg-emerald-500/15 text-emerald-600 rounded border border-emerald-500/30'>
                              {ev.badge}
                            </span>
                          </div>
                          <p className='text-[10px] text-muted-foreground truncate mt-0.5'>
                            {ev.subtitle}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Hover Overlay */}
                    <div className='absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <span className='px-2 py-1 bg-card text-foreground text-[11px] font-semibold rounded shadow-md flex items-center gap-1'>
                        <ZoomIn className='size-3' />
                        Inspect Details
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Linked Entity Context */}
          <div className='bg-card p-4 rounded-lg border border-border shadow-xs space-y-3'>
            <span className='text-[11px] uppercase tracking-wider text-muted-foreground font-bold'>
              LINKED ENTITY CONTEXT
            </span>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
              {/* Linked Booking Mini Card */}
              <div className='p-3 bg-muted/40 rounded-lg border border-border'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='font-mono font-bold text-primary'>
                    #{disputeCase.linkedBookingRef}
                  </span>
                  <span className='font-bold text-foreground'>
                    ${disputeCase.linkedBookingAmountUsd.toFixed(2)} Paid
                  </span>
                </div>
                <p className='text-[12px] text-foreground font-medium'>
                  {disputeCase.linkedBookingDetails}
                </p>
                <p className='text-[11px] text-muted-foreground mt-0.5'>
                  {disputeCase.linkedBookingDate}
                </p>
                <Link
                  to='/dashboard/admin/bookings'
                  search={{ bookingId: disputeCase.linkedBookingRef }}
                  className='inline-flex items-center gap-1 mt-2 text-primary text-[11px] font-semibold hover:underline'
                >
                  <span>View Booking in A08</span>
                  <ExternalLink className='size-3' />
                </Link>
              </div>

              {/* Linked Partner Mini Card */}
              <div className='p-3 bg-muted/40 rounded-lg border border-border'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='font-bold text-foreground truncate'>
                    {disputeCase.linkedSpacePartner}
                  </span>
                  <span className='inline-flex items-center text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1 rounded'>
                    ★ {disputeCase.partnerRating}
                  </span>
                </div>
                <p className='text-[11px] text-muted-foreground'>{disputeCase.partnerHistoricalUptime}</p>
                <p className='text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5'>
                  {disputeCase.partnerTier}
                </p>
                <Link
                  to='/dashboard/admin/organizers/queue'
                  className='inline-flex items-center gap-1 mt-2 text-primary text-[11px] font-semibold hover:underline'
                >
                  <span>View Provider in A05</span>
                  <ExternalLink className='size-3' />
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Communication Log & Audit Trail */}
          <div className='bg-card p-4 rounded-lg border border-border shadow-xs space-y-3'>
            <span className='text-[11px] uppercase tracking-wider text-muted-foreground font-bold'>
              COMMUNICATION LOG & AUDIT TRAIL
            </span>

            <div className='space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-border'>
              {disputeCase.communicationLog.map((log) => (
                <div key={log.id} className='flex items-start gap-3 relative text-xs'>
                  <div
                    className={`size-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-card text-white ${
                      log.iconType === 'terminal'
                        ? 'bg-slate-900'
                        : log.iconType === 'person'
                          ? 'bg-primary'
                          : 'bg-amber-600'
                    }`}
                  >
                    {log.iconType === 'terminal' && <Terminal className='size-3' />}
                    {log.iconType === 'person' && <User className='size-3' />}
                    {log.iconType === 'storefront' && <Store className='size-3' />}
                  </div>

                  <div
                    className={`flex-1 p-2.5 rounded border ${
                      log.variant === 'accent'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-foreground'>{log.sender}</span>
                      <span className='font-mono text-[10px] text-muted-foreground'>
                        {log.timestamp}
                      </span>
                    </div>
                    <p className='text-foreground text-[11px] mt-0.5 leading-relaxed'>
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final Adjudication Resolution Panel (Sticky Footer) */}
        <div className='bg-card border-t border-border p-5 space-y-3.5 shadow-lg select-none shrink-0'>
          <div className='flex items-center justify-between text-xs'>
            <span className='font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
              <Gavel className='size-4 text-primary' />
              ADMINISTRATIVE ADJUDICATION (SOC-2 COMPLIANT)
            </span>
            <span className='text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold'>
              Tamper-Proof Ledger
            </span>
          </div>

          {/* 3 Styled Radio Decision Cards */}
          <div className='space-y-1.5 text-xs'>
            {/* Radio 1 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                selectedDecision === 'partial_credit'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <input
                type='radio'
                id='decision-partial-credit'
                name='adjudication'
                value='partial_credit'
                checked={selectedDecision === 'partial_credit'}
                onChange={() => setSelectedDecision('partial_credit')}
                disabled={disputeCase.status === 'resolved'}
                className='text-primary focus:ring-primary size-4'
              />
              <label htmlFor='decision-partial-credit' className='flex-1 cursor-pointer'>
                <p className='font-semibold text-foreground'>
                  Issue Partial Credit ($22.50 • 50% refund) to Customer
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Deducted from Space Partner monthly disbursement
                </p>
              </label>
            </div>

            {/* Radio 2 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                selectedDecision === 'dismiss'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <input
                type='radio'
                id='decision-dismiss'
                name='adjudication'
                value='dismiss'
                checked={selectedDecision === 'dismiss'}
                onChange={() => setSelectedDecision('dismiss')}
                disabled={disputeCase.status === 'resolved'}
                className='text-primary focus:ring-primary size-4'
              />
              <label htmlFor='decision-dismiss' className='flex-1 cursor-pointer'>
                <p className='font-semibold text-foreground'>
                  Dismiss Report as Unfounded / Ineligible
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Insufficient telemetry proof under Clause 11.2
                </p>
              </label>
            </div>

            {/* Radio 3 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                selectedDecision === 'penalize'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <input
                type='radio'
                id='decision-penalize'
                name='adjudication'
                value='penalize'
                checked={selectedDecision === 'penalize'}
                onChange={() => setSelectedDecision('penalize')}
                disabled={disputeCase.status === 'resolved'}
                className='text-primary focus:ring-primary size-4'
              />
              <label htmlFor='decision-penalize' className='flex-1 cursor-pointer'>
                <p className='font-semibold text-foreground'>
                  Penalize Space Partner (SLA Breach Deduct + Warning)
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Issue formal penalty for mission-critical infrastructure failure
                </p>
              </label>
            </div>
          </div>

          {/* Mandatory Admin Justification Textarea */}
          <div className='space-y-1 text-xs'>
            <div className='flex items-center justify-between'>
              <label htmlFor='dispute-justification-input' className='text-muted-foreground font-semibold'>
                Mandatory Resolution Justification *
              </label>
              <span className='text-[10px] text-muted-foreground'>Min 20 chars</span>
            </div>
            <textarea
              id='dispute-justification-input'
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={disputeCase.status === 'resolved'}
              className='w-full p-2 text-foreground text-xs border border-input rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-60 leading-relaxed'
              rows={2}
              placeholder='Enter formal resolution rationale for audit recording...'
            />
          </div>

          {/* Action Buttons Row */}
          <div className='flex items-center justify-between pt-1 gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleEscalateLegal}
              className='text-xs h-9 text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5'
            >
              <Shield className='size-3.5' />
              <span>Escalate to SecOps Legal</span>
            </Button>

            {disputeCase.status === 'resolved' ? (
              <Button
                type='button'
                disabled
                className='bg-emerald-600 text-white text-xs h-9 font-semibold'
              >
                <CheckCircle2 className='size-4 mr-1.5' />
                Case Closed & Resolved
              </Button>
            ) : (
              <Button
                type='button'
                onClick={handleValidateAndSubmit}
                className='bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 font-semibold shadow-md flex items-center gap-2'
              >
                <CheckCircle2 className='size-4' />
                <span>Submit Case Resolution</span>
              </Button>
            )}
          </div>

          {/* Compliance Subtext */}
          <div className='text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1'>
            <Lock className='size-3 text-emerald-600' />
            <span>All resolution decisions are cryptographically recorded into immutable SOC-2 audit logs.</span>
          </div>
        </div>
      </aside>

      {/* Confirmation Dialog */}
      <DisputeResolutionDialog
        open={resolutionConfirmOpen}
        onOpenChange={setResolutionConfirmOpen}
        disputeCase={disputeCase}
        decisionType={selectedDecision}
        justification={justification}
        onConfirm={() => {
          onSubmitResolution(disputeCase, selectedDecision, justification);
        }}
      />

      {/* Evidence Zoom Modal */}
      <EvidenceZoomDialog
        open={zoomEvidence !== null}
        onOpenChange={(open) => !open && setZoomEvidence(null)}
        evidence={zoomEvidence}
      />
    </>
  );
}
