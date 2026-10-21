import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Image as ImageIcon,
  Layers,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { WorkspaceDirectoryItem } from '../data/mock-workspaces-directory';

interface WorkspaceDetailsDrawerProps {
  workspace: WorkspaceDirectoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (workspace: WorkspaceDirectoryItem) => void;
  onReject: (workspace: WorkspaceDirectoryItem, reason: string) => void;
  onToggleSuspend: (workspace: WorkspaceDirectoryItem, reason?: string) => void;
  isSubmitting?: boolean;
}

export function WorkspaceDetailsDrawer({
  workspace,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onToggleSuspend,
  isSubmitting = false
}: WorkspaceDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'floor' | 'audit'>('general');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && workspace) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen, workspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    if (isOpen && workspace) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, workspace, onClose]);

  if (!isOpen || !workspace) return null;

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
        aria-label={`Workspace Details for ${workspace.name}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[640px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Sticky Header */}
        <div className='border-b border-border bg-card select-none shrink-0'>
          <div className='px-6 py-4 flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground'>
                HUB #{workspace.id}
              </span>

              {workspace.status === 'pending' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-amber-500' aria-hidden='true'></span>
                  Pending Moderation
                </span>
              )}
              {workspace.status === 'active' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                  Active &amp; Bookable
                </span>
              )}
              {workspace.status === 'suspended' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'>
                  <span className='w-1.5 h-1.5 rounded-full bg-rose-500' aria-hidden='true'></span>
                  Suspended
                </span>
              )}
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

          {/* Facility Title */}
          <div className='px-6 pb-4'>
            <h2 className='text-lg sm:text-xl font-bold font-heading text-foreground tracking-tight'>
              {workspace.name}
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Submitted by <strong className='text-foreground font-semibold'>{workspace.organizerLegalName}</strong> • {workspace.submittedAt}
            </p>
          </div>

          {/* Tabs Navigation */}
          <div
            role='tablist'
            aria-label='Workspace details tabs'
            className='px-6 flex gap-6 text-xs font-semibold border-t border-border overflow-x-auto'
          >
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'general'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              General Info
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'media'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Amenities & Media ({workspace.gallery.length})
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'floor'}
              onClick={() => setActiveTab('floor')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'floor'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Floor Plan & Rates
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeTab === 'audit'}
              onClick={() => setActiveTab('audit')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'audit'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Review & Governance
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {activeTab === 'general' && (
            <>
              {/* SECTION: LOCATION & FACILITY SPECS */}
              <section aria-label='Location & Specs' className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <MapPin className='size-3.5 text-primary' aria-hidden='true' />
                    Location &amp; Facility Specs
                  </h3>
                  <span className='font-mono text-[10px] text-muted-foreground'>{workspace.coordinates}</span>
                </div>

                {/* Simulated Geofence Map Graphic */}
                <div className='rounded-xl border border-border bg-muted/40 p-3.5 relative overflow-hidden'>
                  <div className='h-24 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-center p-3 relative'>
                    <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-medium'>
                      <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' aria-hidden='true'></span>
                      {workspace.geofenceCluster}
                    </div>
                    <span className='text-[10px] text-slate-300 mt-1 font-mono'>
                      Geofence Radius: Not available
                    </span>
                  </div>

                  <div className='mt-3 space-y-2 text-xs'>
                    <div>
                      <span className='text-[11px] text-muted-foreground'>Physical Street Address</span>
                      <div className='font-medium text-foreground mt-0.5'>{workspace.streetAddress}</div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60'>
                      <div>
                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                          <Clock className='size-3 text-muted-foreground' aria-hidden='true' />
                          Staffed Reception
                        </span>
                        <div className='font-medium text-foreground mt-0.5'>{workspace.receptionHours}</div>
                      </div>
                      <div>
                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                          <Radio className='size-3 text-primary' aria-hidden='true' />
                          24/7 Nomad Access
                        </span>
                        <div className='font-medium text-primary mt-0.5'>{workspace.accessMethod}</div>
                      </div>
                    </div>

                    <div className='pt-2 border-t border-border/60'>
                      <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                        <Phone className='size-3 text-muted-foreground' aria-hidden='true' />
                        Designated Operator Contact
                      </span>
                      <div className='font-medium text-foreground mt-0.5'>
                        {workspace.operatorContactName} •{' '}
                        <span className='font-mono text-muted-foreground'>{workspace.operatorContactPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: FACILITY MEDIA VERIFICATION */}
              <section aria-label='Media Verification' className='space-y-3 pt-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                    <ImageIcon className='size-3.5 text-primary' aria-hidden='true' />
                    Facility Media Verification
                  </h3>
                  <span className='text-[11px] text-muted-foreground font-semibold'>
                    +{workspace.gallery.length} uploaded photos
                  </span>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
                  {workspace.gallery.map((img) => (
                    <div
                      key={img.id}
                      className='p-3 rounded-lg border border-border bg-muted/30 flex flex-col justify-between h-24 hover:border-primary/40 transition-colors'
                    >
                      <div className='flex items-start justify-between'>
                        <span className='text-[10px] text-muted-foreground'>{img.category}</span>
                        {img.verified && (
                          <CheckCircle2 className='size-3.5 text-emerald-600 dark:text-emerald-400' aria-hidden='true' />
                        )}
                      </div>
                      <div className='font-bold text-foreground text-xs leading-tight'>{img.label}</div>
                    </div>
                  ))}
                </div>

                {/* Feature Tags */}
                <div className='flex flex-wrap gap-1.5 pt-2'>
                  {workspace.tags.map((tag) => (
                    <span
                      key={tag}
                      className='px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              {/* SECTION: MODERATION REVIEW NOTES */}
              <section aria-label='Moderation Notes' className='space-y-2 pt-2'>
                <label htmlFor='moderatorNotes' className='text-xs font-bold text-foreground flex items-center justify-between'>
                  <span>Moderator Review Note / Rejection Reason</span>
                  <span className='text-[10px] font-normal text-muted-foreground'>(Required if rejecting; logged on record)</span>
                </label>
                <Textarea
                  id='moderatorNotes'
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder='Reason for rejection or modification request (e.g. Needs clear fire evacuation diagram, blurry desk photo)...'
                  rows={3}
                  className='text-xs bg-background'
                />
                {workspace.reviewFeedback && (
                  <div className='p-2.5 rounded bg-muted/60 border border-border text-[11px] text-muted-foreground'>
                    <strong className='text-foreground font-semibold'>Existing Review Feedback:</strong> {workspace.reviewFeedback}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'media' && (
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                Complete Photographic Evidence ({workspace.gallery.length} items)
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {workspace.gallery.map((item) => (
                  <div key={item.id} className='p-4 rounded-xl border border-border bg-muted/40 space-y-2'>
                    <div className='h-32 rounded-lg bg-slate-900/10 dark:bg-slate-800 flex items-center justify-center text-muted-foreground overflow-hidden relative'>
                      {item.url ? (
                        <img src={item.url} alt={item.label} className='w-full h-full object-cover' />
                      ) : (
                        <ImageIcon className='size-8 opacity-40' aria-hidden='true' />
                      )}
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <strong className='text-foreground'>{item.label}</strong>
                      <span className='text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]'>
                        <CheckCircle2 className='size-3' aria-hidden='true' /> Verified
                      </span>
                    </div>
                    <p className='text-[11px] text-muted-foreground'>{item.category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'floor' && (
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                Floor Capacity &amp; Resource Allocation
              </h3>
              <div className='p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs'>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Hot Desks (Nomad Stations)</span>
                  <strong className='text-foreground'>{workspace.capacityDesks} Units</strong>
                </div>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Meeting Rooms</span>
                  <strong className='text-foreground'>{workspace.meetingRooms} Rooms</strong>
                </div>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Acoustic Focus &amp; Phone Pods</span>
                  <strong className='text-foreground'>{workspace.focusPods} Pods</strong>
                </div>
                <div className='flex justify-between py-1.5 border-b border-border'>
                  <span className='text-muted-foreground'>Standard Daily Pass Rate</span>
                  <strong className='text-foreground font-mono'>
                    {workspace.pricePerDay ? `${workspace.pricePerDay.toLocaleString()} VND / day` : '150,000 – 250,000 VND / day'}
                  </strong>
                </div>
                {workspace.pricePerHour && (
                  <div className='flex justify-between py-1.5 border-b border-border'>
                    <span className='text-muted-foreground'>Hourly Nomad Rate</span>
                    <strong className='text-foreground font-mono'>{workspace.pricePerHour.toLocaleString()} VND / hr</strong>
                  </div>
                )}
                {workspace.pricePerMonth && (
                  <div className='flex justify-between py-1.5'>
                    <span className='text-muted-foreground'>Dedicated Monthly Desk</span>
                    <strong className='text-foreground font-mono'>{workspace.pricePerMonth.toLocaleString()} VND / mo</strong>
                  </div>
                )}
              </div>

              {workspace.floorsList && workspace.floorsList.length > 0 && (
                <div className='space-y-2 pt-2'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Layers className='size-3.5' aria-hidden='true' />
                    Floor Breakdown ({workspace.floorsList.length} Levels)
                  </h4>
                  <div className='space-y-2'>
                    {workspace.floorsList.map((flp) => (
                      <div key={flp.id} className='p-3 rounded-lg border border-border bg-card flex justify-between items-center text-xs'>
                        <div>
                          <span className='font-semibold text-foreground'>{flp.name}</span>
                          <span className='text-muted-foreground ml-2 text-[11px]'>(Floor {flp.floorNumber})</span>
                        </div>
                        <div className='text-muted-foreground text-[11px] font-mono'>
                          {flp.totalDesks || 0} Desks • {flp.totalRooms || 0} Rooms
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5'>
                <FileText className='size-3.5 text-primary' aria-hidden='true' />
                Review Status &amp; Governance Details
              </h3>
              <div className='p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs'>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Organizer Entity</span>
                  <span className='font-medium text-foreground'>{workspace.organizerLegalName}</span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Tax ID / Registration Number</span>
                  <span className='font-mono text-foreground'>{workspace.organizerTaxId || 'Tax ID Pending'}</span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Partner Verification</span>
                  <span className={`font-semibold flex items-center gap-1 ${workspace.organizerVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    <CheckCircle2 className='size-3.5' aria-hidden='true' />
                    {workspace.organizerVerified ? 'Verified Platform Partner' : 'Verification Incomplete'}
                  </span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Review Status</span>
                  <span className='font-semibold text-foreground'>{workspace.reviewStatus}</span>
                </div>
                {workspace.reviewedBy && (
                  <div className='flex items-center justify-between py-1 border-b border-border'>
                    <span className='text-muted-foreground'>Latest Review Handler</span>
                    <span className='font-mono text-foreground'>{workspace.reviewedBy}</span>
                  </div>
                )}
                {workspace.reviewedAt && (
                  <div className='flex items-center justify-between py-1 border-b border-border'>
                    <span className='text-muted-foreground'>Latest Review Timestamp</span>
                    <span className='text-muted-foreground'>{new Date(workspace.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
                {workspace.reviewFeedback && (
                  <div className='py-1 border-b border-border'>
                    <span className='text-muted-foreground block mb-0.5'>Latest Review Feedback:</span>
                    <span className='text-foreground'>{workspace.reviewFeedback}</span>
                  </div>
                )}
                <div className='text-[10px] text-muted-foreground italic py-1 border-b border-border'>
                  Note: Displays latest recorded review decision metadata. Complete historical event timeline is not recorded.
                </div>
                <div className='flex items-center justify-between py-1 border-b border-border'>
                  <span className='text-muted-foreground'>Moderation Standing</span>
                  <span className={`font-semibold ${workspace.moderationStatus === 'Suspended' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {workspace.moderationStatus}
                  </span>
                </div>
                {workspace.suspendReason && (
                  <div className='py-1 border-b border-border'>
                    <span className='text-muted-foreground block mb-0.5'>Suspension Reason:</span>
                    <span className='text-rose-600 dark:text-rose-400 font-medium'>{workspace.suspendReason}</span>
                  </div>
                )}
                <div className='flex items-center justify-between py-1'>
                  <span className='text-muted-foreground'>Canonical Version</span>
                  <span className='font-mono text-foreground font-semibold'>v{workspace.version}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className='border-t border-border bg-card p-4 space-y-3 shrink-0'>
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground justify-between'>
            <span>
              Canonical Hub: <strong className='font-mono text-foreground'>#{workspace.id}</strong> • Version: <strong className='font-mono text-foreground'>v{workspace.version}</strong>
            </span>
            <span className='text-[10px] text-muted-foreground'>
              {workspace.reviewStatus === 'Pending' ? 'Awaiting Review Decision' : `Status: ${workspace.status}`}
            </span>
          </div>

          <div className='flex items-center gap-3'>
            {workspace.status === 'pending' && (
              <>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isSubmitting}
                  onClick={() => {
                    if (!rejectionNotes || rejectionNotes.trim().length < 5) {
                      toast.error('Rejection Reason Required', {
                        description: 'Please enter a rejection reason (minimum 5 characters) explaining what needs correction.'
                      });
                      return;
                    }
                    onReject(workspace, rejectionNotes.trim());
                  }}
                  className='flex-1 h-10 border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold'
                >
                  <AlertTriangle className='size-3.5 mr-1.5' aria-hidden='true' />
                  <span>{isSubmitting ? 'Rejecting...' : 'Reject with Feedback'}</span>
                </Button>
                <Button
                  type='button'
                  disabled={isSubmitting}
                  onClick={() => onApprove(workspace)}
                  className='flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs'
                >
                  <ShieldCheck className='size-3.5 mr-1.5' aria-hidden='true' />
                  <span>{isSubmitting ? 'Approving...' : 'Approve Workspace'}</span>
                </Button>
              </>
            )}

            {workspace.status === 'active' && (
              <Button
                type='button'
                variant='outline'
                disabled={isSubmitting}
                onClick={() => {
                  setSuspendReasonInput('');
                  setIsSuspendModalOpen(true);
                }}
                className='w-full h-10 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-xs font-semibold'
              >
                <AlertTriangle className='size-3.5 mr-1.5' aria-hidden='true' />
                <span>Suspend Workspace Listing</span>
              </Button>
            )}

            {workspace.status === 'suspended' && (
              <Button
                type='button'
                disabled={isSubmitting}
                onClick={() => onToggleSuspend(workspace)}
                className='w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
              >
                <CheckCircle2 className='size-3.5 mr-1.5' aria-hidden='true' />
                <span>{isSubmitting ? 'Restoring...' : 'Restore to Active Marketplace'}</span>
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className='max-w-md bg-card border border-border shadow-xl'>
          <DialogHeader className='space-y-2'>
            <div className='w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center justify-center'>
              <AlertTriangle className='size-5' aria-hidden='true' />
            </div>
            <DialogTitle className='text-base font-bold font-heading text-foreground'>
              Suspend Workspace Listing
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              Please specify the reason for suspending <strong>{workspace.name}</strong> ({workspace.id}). The workspace will be immediately hidden from the customer marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-2 py-2'>
            <label htmlFor='suspendReason' className='text-xs font-semibold text-foreground'>
              Suspension Reason (Required, min 5 chars)
            </label>
            <Textarea
              id='suspendReason'
              value={suspendReasonInput}
              onChange={(e) => setSuspendReasonInput(e.target.value)}
              placeholder='e.g., Immediate safety audit due to noisy machinery complaint or unverified lease extension...'
              rows={3}
              className='text-xs bg-background'
            />
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsSuspendModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={isSubmitting || suspendReasonInput.trim().length < 5}
              onClick={() => {
                if (suspendReasonInput.trim().length < 5) {
                  toast.error('Suspension Reason Required', {
                    description: 'Please provide at least 5 characters explaining the reason for suspension.'
                  });
                  return;
                }
                setIsSuspendModalOpen(false);
                onToggleSuspend(workspace, suspendReasonInput.trim());
              }}
              className='bg-rose-600 hover:bg-rose-700 text-white font-semibold'
            >
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
