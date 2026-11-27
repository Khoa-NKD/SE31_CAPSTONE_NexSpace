import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building,
  Sparkles,
  ArrowRight,
  Clock
} from '@/components/ui/hugeicons';
import { RefundRecord, formatVnd } from '../data/mock-refunds';

interface RefundActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'approve' | 'reject';
  refund: RefundRecord | null;
  adminNote: string;
  onConfirm: () => Promise<unknown> | void;
  onSuccess?: () => void;
}

type DialogStep = 'idle' | 'processing' | 'success' | 'error';

export function RefundActionDialog({
  open,
  onOpenChange,
  actionType,
  refund,
  adminNote,
  onConfirm,
  onSuccess
}: RefundActionDialogProps) {
  const [step, setStep] = useState<DialogStep>('idle');
  const [processStage, setProcessStage] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [payoutResult, setPayoutResult] = useState<{
    referenceId: string;
    transferredAt: string;
    amount: number;
  } | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number>(3);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setStep('idle');
    setProcessStage(1);
    setErrorMessage('');
    setPayoutResult(null);
    setAutoCloseCountdown(3);
    onOpenChange(false);
  };

  // Handle countdown in success step
  useEffect(() => {
    if (step === 'success') {
      countdownIntervalRef.current = setInterval(() => {
        setAutoCloseCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            onOpenChange(false);
            onSuccess?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [step, onOpenChange, onSuccess]);

  if (!refund) return null;

  const isApprove = actionType === 'approve';

  const handleExecute = async () => {
    if (!isApprove) {
      // Rejection flow
      try {
        setStep('processing');
        await onConfirm();
        handleClose();
        onSuccess?.();
      } catch (err) {
        setStep('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message || 'Có lỗi xảy ra khi từ chối yêu cầu.'
        );
      }
      return;
    }

    // Approval / Payout flow
    setStep('processing');
    setProcessStage(1);
    setErrorMessage('');

    const startTime = Date.now();

    // Stage progression triggers for realistic visual feedback
    const timer1 = setTimeout(() => setProcessStage(2), 700);
    const timer2 = setTimeout(() => setProcessStage(3), 1400);

    try {
      const res = await onConfirm();

      // Ensure minimum 2000ms visual duration so admin observes the live skeleton & progression
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }

      let generatedRef = refund.refundReference || refund.escrowReserveCode;
      if (res && typeof res === 'object' && 'refundReference' in res) {
        const customRef = (res as { refundReference?: string }).refundReference;
        if (customRef) generatedRef = customRef;
      }
      if (!generatedRef) {
        generatedRef = `PAYOS-DISB-${refund.numericId || Date.now().toString().slice(-6)}`;
      }

      setPayoutResult({
        referenceId: generatedRef,
        transferredAt: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        amount: refund.calculatedRefundVnd
      });

      setStep('success');
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setStep('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
              'Cổng thanh toán PayOS báo lỗi hoặc số dư ký quỹ không đủ để thực hiện lệnh chi tức thì.'
      );
    }
  };

  const handleFinishSuccess = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    handleClose();
    onSuccess?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        // Block closing while processing
        if (step === 'processing') return;
        if (!val) {
          handleClose();
        } else {
          onOpenChange(val);
        }
      }}
    >
      <DialogContent
        className='sm:max-w-lg overflow-hidden'
        onPointerDownOutside={(e) => step === 'processing' && e.preventDefault()}
        onEscapeKeyDown={(e) => step === 'processing' && e.preventDefault()}
      >
        {/* ── STEP 1: IDLE / CONFIRMATION REVIEW ── */}
        {step === 'idle' && (
          <>
            <DialogHeader>
              <div className='flex items-center gap-2.5 mb-1'>
                {isApprove ? (
                  <div className='size-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20'>
                    <ShieldCheck className='size-5' />
                  </div>
                ) : (
                  <div className='size-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20'>
                    <AlertTriangle className='size-5' />
                  </div>
                )}
                <div>
                  <DialogTitle className='text-base font-bold'>
                    {isApprove ? 'Xác nhận phê duyệt & Chi tiền PayOS' : 'Xác nhận từ chối hoàn tiền'}
                  </DialogTitle>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5'>
                    <Lock className='size-3 text-emerald-600' />
                    Cổng thanh toán liên ngân hàng NAPAS247 (Escrow Protected)
                  </span>
                </div>
              </div>
              <DialogDescription className='text-xs text-muted-foreground leading-relaxed pt-1'>
                {isApprove
                  ? `Hệ thống sẽ thực hiện lệnh chi ${formatVnd(
                      refund.calculatedRefundVnd
                    )} trực tiếp qua cổng PayOS đến tài khoản ngân hàng của khách hàng ${refund.customerName}.`
                  : `Bạn đang từ chối yêu cầu hoàn tiền ${refund.id} của khách hàng ${refund.customerName}. Không có khoản tiền nào được chi trả.`}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-2 text-xs'>
              <div className='p-3.5 rounded-xl bg-muted/50 space-y-2 border border-border'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Mã đơn đặt chỗ:</span>
                  <span className='font-mono font-semibold'>{refund.bookingRef}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Khách hàng:</span>
                  <span className='font-medium'>{refund.customerName}</span>
                </div>
                {refund.bankAccountNumber && (
                  <div className='flex justify-between items-center border-t border-border/70 pt-2'>
                    <span className='text-muted-foreground flex items-center gap-1.5'>
                      <Building className='size-3.5 text-muted-foreground/80' />
                      Tài khoản nhận:
                    </span>
                    <span className='font-mono font-semibold text-foreground text-right'>
                      {refund.bankName || 'Ngân hàng'} • {refund.bankAccountNumber}
                    </span>
                  </div>
                )}
                <div className='flex justify-between items-center border-t border-border/70 pt-2 font-bold'>
                  <span>{isApprove ? 'Số tiền hoàn qua PayOS:' : 'Số tiền hoàn trả:'}</span>
                  <span className={isApprove ? 'text-emerald-600 font-mono text-sm' : 'text-muted-foreground'}>
                    {isApprove ? formatVnd(refund.calculatedRefundVnd) : '0 VND'}
                  </span>
                </div>
              </div>

              <div>
                <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
                  Ghi chú xử lý của Quản trị viên
                </span>
                <div className='p-2.5 rounded-lg bg-background border border-border text-foreground italic text-[11px]'>
                  "{adminNote || 'Thông tin tài khoản nhận tiền hoàn đã được xác nhận chính xác'}"
                </div>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-1'>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                className='text-xs h-9 cursor-pointer'
              >
                Hủy bỏ
              </Button>
              <Button
                type='button'
                variant={isApprove ? 'default' : 'destructive'}
                onClick={handleExecute}
                className={`text-xs h-9 font-semibold cursor-pointer shadow-sm ${
                  isApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                {isApprove ? 'Phê duyệt & Chi tiền ngay' : 'Xác nhận từ chối'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── STEP 2: PROCESSING / LIVE SKELETON STATE ── */}
        {step === 'processing' && (
          <div className='space-y-4 py-1'>
            <DialogHeader>
              <div className='flex items-center gap-2.5 mb-1'>
                <div className='size-9 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30 animate-pulse'>
                  <Spinner className='size-5' />
                </div>
                <div>
                  <DialogTitle className='text-base font-bold flex items-center gap-2'>
                    <span>Đang thực hiện giải ngân PayOS...</span>
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    Hệ thống đang kết nối ngân hàng thụ hưởng qua giao thức NAPAS247. Vui lòng giữ nguyên màn hình.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stepper Progress Indicator */}
            <div className='p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2.5'>
              <div className='flex items-center justify-between text-[11px] font-medium text-muted-foreground px-0.5'>
                <span>Tiến trình giải ngân tự động</span>
                <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
                  Bước {processStage}/3
                </span>
              </div>

              {/* Progress Line */}
              <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 transition-all duration-500 ease-out rounded-full'
                  style={{
                    width: processStage === 1 ? '35%' : processStage === 2 ? '70%' : '95%'
                  }}
                />
              </div>

              {/* Steps List */}
              <div className='space-y-1.5 pt-1 text-xs'>
                <div className='flex items-center gap-2'>
                  {processStage > 1 ? (
                    <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                  ) : (
                    <Spinner className='size-3.5 text-emerald-600 shrink-0' />
                  )}
                  <span className={processStage >= 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    1. Khởi tạo lệnh chi ủy nhiệm 24/7 tới cổng PayOS
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  {processStage > 2 ? (
                    <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                  ) : processStage === 2 ? (
                    <Spinner className='size-3.5 text-emerald-600 shrink-0' />
                  ) : (
                    <div className='size-3.5 rounded-full border border-border shrink-0' />
                  )}
                  <span className={processStage >= 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    2. Xác thực tài khoản thụ hưởng & Quỹ ký quỹ Escrow
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  {processStage === 3 ? (
                    <Spinner className='size-3.5 text-emerald-600 shrink-0' />
                  ) : (
                    <div className='size-3.5 rounded-full border border-border shrink-0' />
                  )}
                  <span className={processStage >= 3 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    3. Chuyển tiền liên ngân hàng NAPAS247 & Cập nhật sổ cái
                  </span>
                </div>
              </div>
            </div>

            {/* Shimmering Skeleton Payout Preview Card */}
            <div className='relative p-4 rounded-xl border border-emerald-500/20 bg-muted/30 overflow-hidden space-y-3'>
              {/* Subtle Scanning Light Beam */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent animate-pulse pointer-events-none' />

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-5 w-24 rounded-full' />
                  <span className='inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-medium border border-emerald-500/20'>
                    <Lock className='size-2.5' /> PAYOS ESCROW 256-BIT
                  </span>
                </div>
                <Skeleton className='h-4 w-20' />
              </div>

              <div className='space-y-1.5 pt-1'>
                <div className='flex justify-between items-center'>
                  <span className='text-[11px] text-muted-foreground'>Tài khoản thụ hưởng:</span>
                  <span className='text-xs font-mono font-semibold text-foreground'>
                    {refund.bankName || 'Ngân hàng'} • {refund.bankAccountNumber}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-[11px] text-muted-foreground'>Chủ tài khoản:</span>
                  <span className='text-xs font-medium text-foreground'>{refund.customerName}</span>
                </div>
                <div className='flex justify-between items-center border-t border-border/60 pt-1.5'>
                  <span className='text-[11px] text-muted-foreground'>Mã phiên PayOS:</span>
                  <Skeleton className='h-3.5 w-36 font-mono' />
                </div>
              </div>

              {/* Amount Shimmer Banner */}
              <div className='p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
                  <Sparkles className='size-3.5 text-emerald-600' />
                  <span>Số tiền đang giải ngân:</span>
                </div>
                <span className='font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 animate-pulse'>
                  {formatVnd(refund.calculatedRefundVnd)}
                </span>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-1'>
              <Button type='button' variant='outline' disabled className='text-xs h-9 opacity-50 cursor-not-allowed'>
                Hủy bỏ
              </Button>
              <Button
                type='button'
                disabled
                className='text-xs h-9 font-semibold bg-emerald-600/80 text-white cursor-not-allowed'
              >
                <Spinner className='size-3.5 mr-2' />
                Đang giải ngân qua PayOS...
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 3: SUCCESSFUL DISBURSEMENT RECEIPT ── */}
        {step === 'success' && payoutResult && (
          <div className='space-y-4 py-1'>
            <DialogHeader>
              <div className='flex items-center gap-2.5 mb-1'>
                <div className='size-9 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center border border-emerald-500/40 ring-4 ring-emerald-500/10'>
                  <CheckCircle2 className='size-5' />
                </div>
                <div>
                  <DialogTitle className='text-base font-bold text-emerald-600 dark:text-emerald-400'>
                    Hoàn tiền & Chi trả thành công!
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    Giao dịch chuyển khoản qua cổng PayOS đã hoàn tất và ghi sổ cái kiểm toán bất biến.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Receipt Details Card */}
            <div className='p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 text-xs'>
              <div className='flex items-center justify-between border-b border-border/70 pb-2'>
                <div className='flex items-center gap-1.5'>
                  <Building className='size-4 text-emerald-600' />
                  <span className='font-semibold text-foreground'>
                    {refund.bankName || 'Ngân hàng thụ hưởng'} NAPAS 24/7
                  </span>
                </div>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'>
                  THÀNH CÔNG • 200 OK
                </span>
              </div>

              <div className='space-y-1.5 pt-0.5'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Mã giao dịch PayOS:</span>
                  <span className='font-mono font-bold text-foreground'>{payoutResult.referenceId}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Người thụ hưởng:</span>
                  <span className='font-medium text-foreground'>{refund.customerName}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Tài khoản nhận:</span>
                  <span className='font-mono font-medium text-foreground'>{refund.bankAccountNumber}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Thời gian ghi nhận:</span>
                  <span className='text-muted-foreground flex items-center gap-1'>
                    <Clock className='size-3' />
                    {payoutResult.transferredAt} (Thời gian thực)
                  </span>
                </div>
                <div className='flex justify-between items-center border-t border-border/70 pt-2 font-bold'>
                  <span>Số tiền đã giải ngân:</span>
                  <span className='text-emerald-600 font-mono text-base'>
                    {formatVnd(payoutResult.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Confirmation Note */}
            <div className='text-[11px] text-muted-foreground p-2 rounded-lg bg-muted/50 border border-border flex items-center gap-1.5'>
              <Lock className='size-3 text-emerald-600 shrink-0' />
              <span>
                Hệ thống đã tự động lưu vết kiểm toán và gửi thông báo hoàn tiền thành công tới email khách hàng.
              </span>
            </div>

            <DialogFooter className='flex-row items-center justify-between pt-1 sm:justify-between'>
              <span className='text-[11px] text-muted-foreground italic'>
                Tự động đóng trong {autoCloseCountdown} giây...
              </span>
              <Button
                type='button'
                onClick={handleFinishSuccess}
                className='text-xs h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-4'
              >
                Xác nhận & Hoàn tất
                <ArrowRight className='size-3.5 ml-1' />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 4: ERROR / RETRY STATE ── */}
        {step === 'error' && (
          <div className='space-y-4 py-1'>
            <DialogHeader>
              <div className='flex items-center gap-2.5 mb-1'>
                <div className='size-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20'>
                  <AlertTriangle className='size-5' />
                </div>
                <div>
                  <DialogTitle className='text-base font-bold text-red-600'>
                    Lỗi xử lý hoàn tiền PayOS
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    Không thể thực hiện giải ngân tự động qua cổng PayOS.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className='p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 space-y-1'>
              <div className='font-semibold'>Nguyên nhân báo lỗi từ hệ thống:</div>
              <div className='leading-relaxed'>{errorMessage}</div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-1'>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                className='text-xs h-9 cursor-pointer'
              >
                Đóng
              </Button>
              <Button
                type='button'
                variant='default'
                onClick={() => setStep('idle')}
                className='text-xs h-9 font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer'
              >
                Thử lại
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
