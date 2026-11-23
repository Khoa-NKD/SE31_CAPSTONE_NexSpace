import { formatDateLabel } from '@/lib/format';
import React, { useState, useEffect, useRef } from 'react';
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
} from '@/components/ui/hugeicons';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RefundRecord, formatVnd } from '../data/mock-refunds';
import { RefundActionDialog } from './refund-action-dialog';

interface RefundDetailsDrawerProps {
  refund: RefundRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (refund: RefundRecord, note: string) => void;
  onReject: (refund: RefundRecord, note: string) => void;
  language?: 'vi' | 'en';
}

export function RefundDetailsDrawer({
  refund,
  isOpen,
  onClose,
  onApprove,
  onReject,
  language = 'vi'
}: RefundDetailsDrawerProps) {
  const isVi = language === 'vi';
  const [adminNote, setAdminNote] = useState<string>(
    refund?.adminResolutionNote ||
      (isVi
        ? 'Phê duyệt hoàn tiền theo chính sách hủy đơn hợp lệ của NexSpace.'
        : 'Approved under cancellation policy rules.')
  );
  const [actionModalType, setActionModalType] = useState<'approve' | 'reject' | null>(null);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && refund) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen, refund]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && !actionModalType && !photoZoomOpen) {
        onClose();
        triggerRef.current?.focus?.({ preventScroll: true });
      }
    };
    if (isOpen && refund) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, refund, actionModalType, photoZoomOpen, onClose]);

  if (!isOpen || !refund) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 transition-opacity'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-over Container */}
      <aside
        role='dialog'
        aria-label={`Refund Claim Details for ${refund.id}`}
        aria-modal='true'
        className='fixed top-0 right-0 w-full max-w-[560px] h-screen bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200'
      >
        {/* Top Header */}
        <div className='border-b border-border bg-card p-5 select-none shrink-0'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2.5'>
              <span className='font-mono text-base font-bold text-foreground'>
                {refund.id}
              </span>

              {refund.status === 'pending' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'>
                  <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                  {isVi ? 'Chờ thẩm định' : 'Pending Adjudication'}
                </span>
              )}
              {refund.status === 'processed' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'>
                  <span className='size-1.5 rounded-full bg-emerald-500' />
                  {isVi ? 'Đã chi tiền PayOS' : 'Processed & Disbursed'}
                </span>
              )}
              {refund.status === 'rejected' && (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40'>
                  <span className='size-1.5 rounded-full bg-rose-500' />
                  {isVi ? 'Đã từ chối' : 'Claim Rejected'}
                </span>
              )}
            </div>

            <button
              type='button'
              onClick={onClose}
              className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors'
              title={isVi ? 'Đóng (Esc)' : 'Close Drawer (Esc)'}
            >
              <X className='size-4.5' />
            </button>
          </div>

          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1'>
              <Timer className='size-3.5' />
              SLA: {refund.slaRemaining}
            </span>
            <span>•</span>
            <span>{formatDateLabel(refund.triggeredAt)}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-5 space-y-5'>
          {/* Section 1: Booking & Context Summary */}
          <div className='space-y-2.5'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                {isVi ? 'Thông tin đơn đặt chỗ gốc' : 'Booking & Context Summary'}
              </span>
              <Link
                to='/dashboard/admin/bookings'
                search={{ bookingId: refund.bookingRef.replace('#', '') }}
                className='text-[11px] text-primary hover:underline font-semibold flex items-center gap-1'
              >
                <span>{isVi ? `Xem đặt chỗ (${refund.bookingRef})` : `View Booking (${refund.bookingRef})`}</span>
                <ExternalLink className='size-3' />
              </Link>
            </div>

            <div className='bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5 text-xs'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {isVi ? 'Khách hàng' : 'Customer'}
                  </span>
                  <span className='font-semibold text-foreground'>{refund.customerName}</span>
                  <span className='text-[11px] text-muted-foreground block truncate'>
                    {refund.customerCompany || refund.customerEmail}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {isVi ? 'Không gian đặt chỗ' : 'Reserved Space'}
                  </span>
                  <span className='font-semibold text-foreground'>{refund.workspaceHub}</span>
                  <span className='text-[11px] text-muted-foreground block'>{refund.spaceDetails}</span>
                </div>
              </div>

              <div className='border-t border-border pt-2 grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {isVi ? 'Thời gian ghi nhận' : 'Timeline Context'}
                  </span>
                  <div className='text-foreground font-medium'>
                    {formatDateLabel(refund.triggeredAt)}
                  </div>
                </div>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {isVi ? 'Chính sách áp dụng' : 'Applicable Policy'}
                  </span>
                  <span className='inline-block font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] mt-0.5'>
                    {refund.policyClause}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Claim Reason */}
          <div className='space-y-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              {isVi ? 'Lý do khiếu nại của khách hàng' : 'Customer Claim Reason'}
            </span>

            <div className='p-3.5 rounded-xl border border-border bg-card text-xs leading-relaxed space-y-1.5'>
              <div className='flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]'>
                <Quote className='size-3.5 text-muted-foreground/70' />
                <span>{isVi ? 'Nội dung yêu cầu từ khách hàng' : 'Customer Incident Statement'}</span>
              </div>
              <p className='text-foreground bg-muted/40 p-2.5 rounded-lg border border-border italic'>
                "{refund.customerStatement || refund.claimReason}"
              </p>
            </div>

            {/* Evidence Preview Card */}
            {refund.evidence && (
              <div className='border border-border rounded-xl p-3 bg-card'>
                <div className='flex items-start gap-3'>
                  {refund.evidence.thumbnailUrl ? (
                    <button
                      type='button'
                      onClick={() => setPhotoZoomOpen(true)}
                      aria-label='Zoom incident photograph'
                      className='relative size-20 rounded-lg overflow-hidden bg-muted border border-border shrink-0 group cursor-pointer text-left p-0'
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
                        EXIF: {formatDateLabel(refund.evidence.exifTimestamp)}
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

          {/* Section 3: Financial Settlement Calculation in VND */}
          <div className='space-y-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              {isVi ? 'Bảng tính toán số tiền hoàn trả' : 'Automated Refund Settlement Calculation'}
            </span>

            <div className='bg-muted/40 border border-border rounded-xl p-3.5 text-xs space-y-2.5'>
              <div className='flex items-center justify-between text-muted-foreground'>
                <span>{isVi ? 'Tổng tiền khách đã thanh toán:' : 'Original Customer Reservation Amount:'}</span>
                <span className='font-mono font-semibold text-foreground'>
                  {formatVnd(refund.originalPaidVnd)}
                </span>
              </div>

              <div className='flex items-center justify-between text-muted-foreground'>
                <span>{isVi ? 'Khấu trừ phí nền tảng & xử lý:' : 'Gateway & Platform Fee Adjustment:'}</span>
                <span className='font-mono text-rose-500 font-medium'>
                  -{formatVnd(refund.gatewayFeeDeductionVnd)}
                </span>
              </div>

              <div className='border-t border-border pt-2.5 flex items-center justify-between'>
                <div>
                  <div className='font-bold text-foreground text-sm'>
                    {isVi ? 'Thực nhận hoàn tiền của khách' : 'Net Refund to Customer'}
                  </div>
                  <div className='text-[10px] text-muted-foreground'>
                    {isVi ? 'Chi trả tự động qua tài khoản PayOS' : 'Direct reversal to original payment method'}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-mono font-bold text-lg text-primary leading-none'>
                    {formatVnd(refund.calculatedRefundVnd)}
                  </div>
                  <div className='text-[10px] text-muted-foreground mt-0.5'>
                    {refund.policyTierLabel}
                  </div>
                </div>
              </div>

              {/* Escrow Status Callout */}
              <div className='mt-2 pt-2 border-t border-dashed border-border flex items-center gap-2 text-[11px] text-muted-foreground bg-card p-2 rounded-lg border border-border'>
                <ShieldCheck className='size-4 text-emerald-600 shrink-0' />
                <span>
                  {isVi ? 'Cổng thanh toán PayOS:' : 'PayOS Payout Gateway:'}{' '}
                  <strong className='text-foreground'>{refund.escrowReserveCode}</strong>. {isVi ? 'Chuyển khoản liên ngân hàng 24/7 khi phê duyệt.' : 'Napas 24/7 automated transfer upon approval.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Customer Payout Bank Account Details */}
          <div className='space-y-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between'>
              <span>{isVi ? 'Tài khoản ngân hàng thụ hưởng (PayOS Payout)' : 'Beneficiary Bank Account'}</span>
              {refund.bankAccountNumber ? (
                <span className='text-[10px] text-emerald-600 font-medium flex items-center gap-1'>
                  <CheckCircle2 className='size-3' /> {isVi ? 'Sẵn sàng chi tiền' : 'Ready for Payout'}
                </span>
              ) : (
                <span className='text-[10px] text-amber-500 font-medium'>
                  {isVi ? 'Chưa có thông tin tài khoản' : 'No account details'}
                </span>
              )}
            </span>

            <div className='p-3.5 rounded-xl border border-border bg-card text-xs space-y-2'>
              {refund.bankAccountNumber ? (
                <>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>{isVi ? 'Ngân hàng:' : 'Bank:'}</span>
                    <span className='font-semibold text-foreground'>
                      {refund.bankName || 'Ngân hàng nội địa'} {refund.bankBin ? `(BIN: ${refund.bankBin})` : ''}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>{isVi ? 'Số tài khoản:' : 'Account Number:'}</span>
                    <span className='font-mono font-bold text-foreground'>{refund.bankAccountNumber}</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground'>{isVi ? 'Chủ tài khoản:' : 'Account Name:'}</span>
                    <span className='font-semibold text-foreground uppercase'>{refund.bankAccountName || refund.customerName}</span>
                  </div>
                  {refund.refundReference && (
                    <div className='flex items-center justify-between border-t border-border pt-1.5 text-[11px]'>
                      <span className='text-muted-foreground'>{isVi ? 'Mã Payout PayOS:' : 'PayOS Reference:'}</span>
                      <span className='font-mono font-medium text-emerald-600'>{refund.refundReference}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className='text-amber-600 dark:text-amber-400 text-[11px] italic'>
                  {isVi
                    ? 'Khách hàng chưa cung cấp thông tin tài khoản ngân hàng. Tiền hoàn sẽ tạm giữ cho đến khi khách cập nhật.'
                    : 'Customer has not provided bank details yet.'}
                </p>
              )}
            </div>
          </div>

          {/* Section 5: Mandatory Admin Resolution Note */}
          <div className='space-y-1.5'>
            <label
              htmlFor='refund-admin-note'
              className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between'
            >
              <span>{isVi ? 'Ghi chú thẩm định của Quản trị viên' : 'Admin Resolution Note'}</span>
              <span className='text-[10px] text-muted-foreground'>Audit Trail</span>
            </label>
            <textarea
              id='refund-admin-note'
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={refund.status !== 'pending'}
              className='w-full text-xs p-3 bg-card border border-input rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60 resize-none'
              rows={3}
              placeholder={isVi ? 'Nhập ghi chú hoặc lý do phê duyệt / từ chối...' : 'Enter reason for approval or rejection...'}
            />
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
                className='border-rose-500/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs h-9 font-semibold flex items-center gap-1.5'
              >
                <Ban className='size-4' />
                <span>{isVi ? 'Từ chối' : 'Reject'}</span>
              </Button>

              <Button
                type='button'
                onClick={() => setActionModalType('approve')}
                className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold flex items-center justify-center gap-2 shadow-2xs'
              >
                <CheckCircle2 className='size-4' />
                <span>{isVi ? `Phê duyệt & Chi PayOS (${formatVnd(refund.calculatedRefundVnd)})` : `Approve & PayOS (${formatVnd(refund.calculatedRefundVnd)})`}</span>
              </Button>
            </div>
          ) : (
            <div className='p-2.5 rounded-xl bg-muted/50 border border-border text-center text-xs text-muted-foreground'>
              {isVi ? 'Yêu cầu hoàn tiền này đã ở trạng thái ' : 'This refund record is marked as '}
              <strong className='text-foreground'>{refund.statusBadge}</strong>.
            </div>
          )}

          <div className='text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1'>
            <Lock className='size-3 text-emerald-600' />
            <span>{isVi ? 'Lệnh chi tiền được xác thực bảo mật và lưu vết kiểm toán bất biến.' : 'Authorized via PayOS Escrow Webhook. Immutable audit log.'}</span>
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
            <div className='rounded-xl overflow-hidden'>
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
