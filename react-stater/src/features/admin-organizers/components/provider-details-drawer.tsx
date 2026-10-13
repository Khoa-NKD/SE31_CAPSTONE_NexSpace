import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  FileCheck2,
  Landmark,
  CheckCircle2,
  History,
  Lock,
  ZoomIn,
  Check,
  Ban
} from 'lucide-react';
import { VerificationApplication, VerificationDocument } from '../data/mock-organizers';
import { DocumentScanDialog } from './document-scan-dialog';
import { ApprovalConfirmDialog } from './approval-confirm-dialog';
import { RejectionConfirmDialog } from './rejection-confirm-dialog';

interface ProviderDetailsDrawerProps {
  application: VerificationApplication | null;
  onClose: () => void;
  onApprove: (appId: string) => void;
  onReject: (appId: string, reason: string) => void;
}

export function ProviderDetailsDrawer({
  application,
  onClose,
  onApprove,
  onReject
}: ProviderDetailsDrawerProps) {
  const [rejectionNotice, setRejectionNotice] = useState<string>('');
  const [selectedScanDoc, setSelectedScanDoc] = useState<VerificationDocument | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState<boolean>(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedScanDoc && !showApprovalDialog && !showRejectionDialog) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (application && application.documents.length > 0) {
          setSelectedScanDoc(application.documents[0]);
        }
      }
    };
    if (application) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [application, selectedScanDoc, showApprovalDialog, showRejectionDialog, onClose]);

  if (!application) return null;

  const gpkdDoc = application.documents.find((d) => d.type === 'gpkd') || application.documents[0];
  const cccdDoc = application.documents.find((d) => d.type === 'cccd') || application.documents[1];
  const bankDoc = application.documents.find((d) => d.type === 'bank_certificate') || application.documents[2];

  const handleConfirmApproval = () => {
    setShowApprovalDialog(false);
    onApprove(application.id);
  };

  const handleConfirmRejection = () => {
    setShowRejectionDialog(false);
    onReject(application.id, rejectionNotice);
  };

  return (
    <>
      {/* Semi-transparent backdrop blur overlay */}
      <div
        onClick={onClose}
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-150'
        aria-hidden='true'
      />

      {/* Slide-Over Inspection Drawer (640px Wide) */}
      <aside
        className='fixed right-0 top-0 bottom-0 h-full w-full max-w-[640px] bg-card shadow-2xl z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-200'
        role='dialog'
        aria-label={`Verification Application ${application.id} Details`}
      >
        {/* 1. Drawer Header (Sticky Top) */}
        <div className='p-5 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10'>
          <div className='flex items-center justify-between gap-3 mb-2.5'>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-primary'>
                #{application.id}
              </span>
              <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold'>
                <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' aria-hidden='true'></span>
                SLA Target: {application.slaRemaining}
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => setSelectedScanDoc(gpkdDoc || null)}
                className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                title='Open in dedicated scan modal (⌘O)'
                aria-label='Open in dedicated scan modal'
              >
                <ExternalLink className='size-4' aria-hidden='true' />
              </button>
              <button
                type='button'
                onClick={onClose}
                className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                title='Close drawer (ESC)'
                aria-label='Close drawer'
              >
                <X className='size-4' aria-hidden='true' />
              </button>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <div className='h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary'>
              <Building2 className='size-5' aria-hidden='true' />
            </div>
            <div className='min-w-0'>
              <h2 className='text-base font-bold font-heading text-foreground truncate'>
                {application.legalName}
              </h2>
              <p className='text-xs text-muted-foreground'>
                Trade name: <strong className='text-foreground'>{application.tradeName}</strong> • {application.category}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6 bg-muted/20'>
          {/* Section 1: Business Registry Profile */}
          <section className='bg-card rounded-xl border border-border p-4 shadow-2xs'>
            <div className='flex items-center justify-between pb-3 mb-3 border-b border-border'>
              <div className='flex items-center gap-2'>
                <ShieldCheck className='size-4 text-muted-foreground' aria-hidden='true' />
                <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
                  Business Registry Profile
                </h3>
              </div>
              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800'>
                <CheckCircle2 className='size-3' aria-hidden='true' />
                National Portal Active
              </span>
            </div>

            <div className='grid grid-cols-2 gap-x-4 gap-y-3 text-xs'>
              <div>
                <span className='text-muted-foreground block text-[10px] uppercase tracking-wide'>Tax Code (MST)</span>
                <span className='font-mono font-bold text-foreground'>{application.taxCode}</span>
              </div>
              <div>
                <span className='text-muted-foreground block text-[10px] uppercase tracking-wide'>Legal Representative</span>
                <span className='font-medium text-foreground'>{application.legalRepresentative}</span>
              </div>
              <div className='col-span-2'>
                <span className='text-muted-foreground block text-[10px] uppercase tracking-wide'>Registered Headquarters</span>
                <span className='text-foreground'>{application.registeredAddress}</span>
              </div>
              <div>
                <span className='text-muted-foreground block text-[10px] uppercase tracking-wide'>Business Category</span>
                <span className='text-foreground'>{application.category}</span>
              </div>
              <div>
                <span className='text-muted-foreground block text-[10px] uppercase tracking-wide'>Charter Capital</span>
                <span className='font-mono font-medium text-foreground'>{application.charterCapital}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Uploaded Legal Documents */}
          <section className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <FileText className='size-4 text-muted-foreground' aria-hidden='true' />
                <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
                  Uploaded Legal Documents ({application.documentsUploadedCount}/{application.totalDocumentsCount})
                </h3>
              </div>
              <span className='text-[11px] text-muted-foreground'>Click thumbnail for deep inspection</span>
            </div>

            {/* Document Card A: GPKD / ERC */}
            {gpkdDoc && (
              <div className='bg-card rounded-xl border border-border p-4 shadow-2xs hover:border-primary/40 transition-all'>
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='flex items-start gap-3'>
                    <div className='w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800'>
                      <FileCheck2 className='size-5' aria-hidden='true' />
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-foreground'>{gpkdDoc.title}</h4>
                      <p className='text-[11px] text-muted-foreground'>
                        {gpkdDoc.englishTitle} • {gpkdDoc.fileFormat} • {gpkdDoc.fileSize} • Uploaded {gpkdDoc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold shrink-0'>
                    <CheckCircle2 className='size-3' aria-hidden='true' />
                    OCR Match: {gpkdDoc.ocrMatchRate}%
                  </span>
                </div>

                {/* Preview Box with Red Seal Watermark Simulation */}
                <button
                  type='button'
                  onClick={() => setSelectedScanDoc(gpkdDoc)}
                  className='w-full text-left relative h-32 rounded-lg bg-muted/60 border border-border overflow-hidden flex items-center justify-center p-3 group cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary'
                  aria-label='Inspect Giấy phép kinh doanh document in fullscreen'
                >
                  <div className='absolute inset-0 opacity-15 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:8px_8px]'></div>

                  {/* Red Official Seal Watermark Simulation */}
                  <div className='absolute right-6 top-3 w-20 h-20 rounded-full border-2 border-dashed border-rose-500/30 flex items-center justify-center pointer-events-none rotate-12'>
                    <div className='text-[9px] text-rose-600/50 uppercase font-bold text-center leading-tight'>
                      ★ SỞ KH&amp;ĐT ★<br />TP. HỒ CHÍ MINH<br />ĐÃ CHỨNG THỰC
                    </div>
                  </div>

                  {/* Content preview simulation */}
                  <div className='w-full max-w-sm text-[10px] space-y-1 text-muted-foreground select-none'>
                    <div className='flex justify-between font-bold text-foreground border-b border-border pb-1'>
                      <span>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                      <span>MÃ SỐ DN: {gpkdDoc.details.regNumber || '0312345678'}</span>
                    </div>
                    <div className='text-foreground pt-0.5 truncate'>
                      Tên công ty: <strong>{gpkdDoc.details.companyName || application.legalName}</strong>
                    </div>
                    <div className='truncate'>
                      Đại diện pháp luật: {gpkdDoc.details.legalRep || application.legalRepresentative}
                    </div>
                    <div className='truncate'>
                      Địa chỉ: {gpkdDoc.details.headquarters || application.registeredAddress}
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className='absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                    <span className='px-3 py-1.5 rounded-lg bg-card text-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md'>
                      <ZoomIn className='size-3.5' aria-hidden='true' />
                      Open Fullscreen Scan (⌘O)
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Document Card B: Citizen ID / CCCD */}
            {cccdDoc && (
              <div className='bg-card rounded-xl border border-border p-4 shadow-2xs hover:border-primary/40 transition-all'>
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='flex items-start gap-3'>
                    <div className='w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800'>
                      <ShieldCheck className='size-5' aria-hidden='true' />
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-foreground'>{cccdDoc.title} of Legal Rep</h4>
                      <p className='text-[11px] text-muted-foreground'>
                        Biometric Card • {cccdDoc.fileFormat} • {cccdDoc.fileSize}
                      </p>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold shrink-0'>
                    <CheckCircle2 className='size-3' aria-hidden='true' />
                    Biometric: {cccdDoc.details.biometricMatchRate || 99.4}%
                  </span>
                </div>

                {/* CCCD Mini Visual Dual-Cards */}
                <div className='grid grid-cols-2 gap-3'>
                  {/* Front of ID */}
                  <button
                    type='button'
                    onClick={() => setSelectedScanDoc(cccdDoc)}
                    className='w-full text-left border border-border rounded-lg p-2.5 bg-muted/40 flex flex-col justify-between h-28 relative group cursor-pointer overflow-hidden focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary'
                    aria-label='Inspect Citizen ID front in fullscreen'
                  >
                    <div className='flex justify-between items-center text-[9px] text-muted-foreground'>
                      <span className='font-semibold text-foreground'>MẶT TRƯỚC (FRONT)</span>
                      <span className='font-mono font-bold text-primary'>VN-CCCD</span>
                    </div>
                    <div className='flex items-center gap-2 my-auto'>
                      <div className='w-8 h-10 rounded bg-slate-300 dark:bg-slate-700 shrink-0 overflow-hidden'>
                        <img
                          src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
                          alt='Biometric thumbnail'
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div className='text-[9px] space-y-0.5 leading-tight'>
                        <div className='text-muted-foreground'>Số / No: <strong className='text-foreground font-mono'>{cccdDoc.details.idNumber || '079088001234'}</strong></div>
                        <div className='font-bold text-foreground'>{cccdDoc.details.legalRep || 'NGUYỄN VĂN A'}</div>
                        <div className='text-muted-foreground text-[8px]'>DOB: {cccdDoc.details.dob || '14/08/1988'}</div>
                      </div>
                    </div>
                    <div className='text-[8px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium'>
                      <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                      Facial Biometric Match: 99.4%
                    </div>
                  </button>

                  {/* Back of ID */}
                  <button
                    type='button'
                    onClick={() => setSelectedScanDoc(cccdDoc)}
                    className='w-full text-left border border-border rounded-lg p-2.5 bg-muted/40 flex flex-col justify-between h-28 relative group cursor-pointer overflow-hidden focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary'
                    aria-label='Inspect Citizen ID back in fullscreen'
                  >
                    <div className='flex justify-between items-center text-[9px] text-muted-foreground'>
                      <span className='font-semibold text-foreground'>MẶT SAU (BACK)</span>
                      <ShieldCheck className='size-3 text-muted-foreground' aria-hidden='true' />
                    </div>
                    <div className='space-y-1 text-[9px] my-auto'>
                      <div className='text-muted-foreground text-[8px] truncate'>Đặc điểm: Sẹo đuôi mày trái</div>
                      <div className='font-mono text-[8px] text-muted-foreground bg-muted p-1 rounded truncate'>
                        IDVNM0790880012348&lt;&lt;&lt;
                      </div>
                    </div>
                    <div className='text-[8px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium'>
                      <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
                      MRZ Checksum Verified
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Document Card C: Bank Account Ownership Letter */}
            {bankDoc && (
              <div className='bg-card rounded-xl border border-border p-4 shadow-2xs hover:border-primary/40 transition-all'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-start gap-3'>
                    <div className='w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800'>
                      <Landmark className='size-5' aria-hidden='true' />
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-foreground'>{bankDoc.title}</h4>
                      <p className='text-[11px] text-muted-foreground'>{bankDoc.englishTitle}</p>
                      <div className='mt-2 flex flex-wrap items-center gap-2 text-xs font-mono'>
                        <span className='text-muted-foreground'>Account:</span>
                        <span className='font-bold text-foreground'>{bankDoc.details.bankAccount || '0071000889988'}</span>
                        <span className='text-muted-foreground'>•</span>
                        <span className='text-muted-foreground font-sans'>{bankDoc.details.bankBranch || 'Vietcombank Saigon Branch'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => setSelectedScanDoc(bankDoc)}
                    className='px-2.5 py-1 rounded bg-card border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors shrink-0'
                  >
                    Inspect
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Verification Audit History & Internal Notes */}
          <section className='bg-card rounded-xl border border-border p-4 shadow-2xs'>
            <div className='flex items-center gap-2 pb-3 mb-3 border-b border-border'>
              <History className='size-4 text-muted-foreground' aria-hidden='true' />
              <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
                Verification Audit Trail
              </h3>
            </div>
            <div className='relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border text-xs'>
              {application.auditTrail.map((ev) => (
                <div key={ev.id} className='relative'>
                  <span
                    className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-card ${
                      ev.status === 'passed'
                        ? 'bg-emerald-500'
                        : ev.status === 'critical'
                        ? 'bg-rose-500'
                        : ev.status === 'pending'
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                  ></span>
                  <div className='flex items-baseline justify-between gap-2'>
                    <span className='font-semibold text-foreground'>{ev.title}</span>
                    <span className='text-[10px] text-muted-foreground font-mono'>{ev.timestamp}</span>
                  </div>
                  <p className='text-muted-foreground text-[11px] mt-0.5'>{ev.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 3. Administrative Decision Footer (Sticky Bottom) */}
        <div className='p-5 border-t border-border bg-card sticky bottom-0 z-20 space-y-3.5 shadow-lg'>
          {/* HSM Security Key Notice */}
          <div className='flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border'>
            <Lock className='size-3.5 text-primary shrink-0' aria-hidden='true' />
            <span>Decision will be cryptographically signed with SecOps HSM Session Key #HSM-9921-X.</span>
          </div>

          {/* Rejection / Correction Notice Textarea */}
          <div>
            <label htmlFor='rejectionNoticeText' className='block text-xs font-medium text-foreground mb-1'>
              Rejection / Correction Notice <span className='text-muted-foreground font-normal'>(Required if rejecting application)</span>
            </label>
            <textarea
              id='rejectionNoticeText'
              rows={2}
              value={rejectionNotice}
              onChange={(e) => setRejectionNotice(e.target.value)}
              placeholder='Enter specific feedback for correction (e.g., Blurry photo of CCCD back, Expired business license seal, Tax code mismatch)...'
              className='w-full text-xs text-foreground placeholder:text-muted-foreground rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary p-2.5 resize-none'
            />
          </div>

          {/* Action Buttons Row */}
          <div className='flex items-center justify-between gap-3 pt-1'>
            {/* Reject Button */}
            <button
              type='button'
              onClick={() => setShowRejectionDialog(true)}
              className='flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-card border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors shadow-2xs'
            >
              <Ban className='size-4' aria-hidden='true' />
              <span>Reject &amp; Request Re-submission</span>
            </button>

            {/* Approve Button */}
            <button
              type='button'
              onClick={() => setShowApprovalDialog(true)}
              className='flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-500/20'
            >
              <Check className='size-4' aria-hidden='true' />
              <span>Approve Organizer &amp; Authorize</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Fullscreen Document Scan Modal */}
      <DocumentScanDialog
        document={selectedScanDoc}
        isOpen={selectedScanDoc !== null}
        onClose={() => setSelectedScanDoc(null)}
      />

      {/* Approval Confirmation Dialog */}
      <ApprovalConfirmDialog
        application={application}
        isOpen={showApprovalDialog}
        onClose={() => setShowApprovalDialog(false)}
        onConfirm={handleConfirmApproval}
      />

      {/* Rejection Confirmation Dialog */}
      <RejectionConfirmDialog
        application={application}
        rejectionReason={rejectionNotice}
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        onConfirm={handleConfirmRejection}
      />
    </>
  );
}
