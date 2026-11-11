import { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  ArrowRight,
  ShieldCheck,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Timer,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { NexSpaceLogo, NexSpaceMark } from '@/components/brand/logo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { useCurrency } from '@/features/landing/context/currency-context';
import type { PaymentCheckoutResponse } from '@/features/payments/api/types';
import { usePaymentStatus, useCancelPayment } from '@/features/payments/api';
import { toast } from 'sonner';

interface PayOSCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmountUsd?: number;
  seatCode?: string;
  orderRef?: string;
  checkoutData?: PaymentCheckoutResponse | null;
  isLoading?: boolean;
  onRetry?: () => void;
}

export function PayOSCheckoutDialog({
  open,
  onOpenChange,
  totalAmountUsd = 11.0,
  seatCode = 'Desk A-04',
  orderRef = '#NX-8821',
  checkoutData,
  isLoading = false,
  onRetry
}: PayOSCheckoutDialogProps) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isManualSuccess, setIsManualSuccess] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const hasNotifiedSuccessRef = useRef(false);
  const hasNotifiedExpiryRef = useRef(false);

  const cancelMutation = useCancelPayment();

  // Real-time polling for payment status
  const bookingId = checkoutData?.bookingId;
  const { data: statusData } = usePaymentStatus(bookingId, open && !isManualSuccess);

  const isConfirmed =
    isManualSuccess ||
    statusData?.paymentStatus === 'SUCCESS' ||
    statusData?.bookingStatus === 'CONFIRMED';

  const expiryTimestamp = checkoutData?.expiresAt ? new Date(checkoutData.expiresAt).getTime() : 0;
  const secondsRemaining = expiryTimestamp > 0
    ? Math.max(0, Math.floor((expiryTimestamp - currentTimestamp) / 1000))
    : 900;

  const isExpired =
    !isConfirmed &&
    (secondsRemaining <= 0 ||
      statusData?.paymentStatus === 'EXPIRED' ||
      statusData?.bookingStatus === 'EXPIRED' ||
      statusData?.bookingStatus === 'CANCELLED');

  useEffect(() => {
    if (isConfirmed && !hasNotifiedSuccessRef.current) {
      hasNotifiedSuccessRef.current = true;
      toast.success('Thanh toán thành công!', {
        description: `Đơn đặt chỗ #${checkoutData?.bookingCode || orderRef} đã được xác nhận.`
      });
    }
  }, [isConfirmed, checkoutData, orderRef]);

  // Notify when booking/payment expires
  useEffect(() => {
    if (isExpired && open && !hasNotifiedExpiryRef.current) {
      hasNotifiedExpiryRef.current = true;
      toast.error('Phiên giữ chỗ đã hết hạn', {
        description: 'Vị trí đã được giải phóng. Bạn vui lòng tạo phiên mới để đặt lại.'
      });
    }
  }, [isExpired, open]);

  // Countdown timer clock
  useEffect(() => {
    if (!open || isConfirmed || isExpired) return;
    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [open, isConfirmed, isExpired]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsManualSuccess(false);
      hasNotifiedSuccessRef.current = false;
      hasNotifiedExpiryRef.current = false;
      setCurrentTimestamp(Date.now());
    }
    onOpenChange(isOpen);
  };

  const handleCopy = (value: string, fieldName: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(fieldName);
    toast.info('Đã sao chép: ' + value);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancelCheckout = () => {
    if (checkoutData?.orderCode) {
      cancelMutation.mutate(
        { orderCode: checkoutData.orderCode, reason: 'Khách hàng hủy giữ chỗ' },
        {
          onSuccess: () => {
            toast.info('Đã hủy phiên thanh toán và giải phóng slot giữ chỗ');
            handleOpenChange(false);
          }
        }
      );
    } else {
      handleOpenChange(false);
    }
  };

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const displayOrderRef = checkoutData?.bookingCode
    ? `#${checkoutData.bookingCode}`
    : checkoutData?.orderCode
      ? `#NX-${checkoutData.orderCode % 10000}`
      : orderRef;

  const displayVndAmount = checkoutData?.amount
    ? checkoutData.amount.toLocaleString('vi-VN') + ' ₫'
    : Math.round(totalAmountUsd * 25450).toLocaleString('vi-VN') + ' ₫';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-card border-border sm:max-w-[480px] w-[95vw] max-h-[92vh] flex flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl [&>button]:hidden'>
        <style>{`
          @keyframes scanline {
            0% { top: 6%; opacity: 0.15; }
            50% { top: 90%; opacity: 0.85; }
            100% { top: 6%; opacity: 0.15; }
          }
          .scanner-line {
            animation: scanline 2.8s ease-in-out infinite;
          }
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(79, 70, 229, 0); }
            100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
          }
          .pulse-glow {
            animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        {/* Minimalist Top Control Bar */}
        <div className='border-border/60 bg-muted/40 shrink-0 flex items-center justify-between border-b px-4 py-2.5 text-xs'>
          <button
            type='button'
            onClick={() => handleOpenChange(false)}
            className='text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 font-medium transition-colors group'
          >
            <ArrowLeft className='h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5' />
            <span>
              Quay lại <strong className='text-foreground font-mono'>({displayOrderRef})</strong>
            </span>
          </button>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
              <span className='font-mono text-[10px] font-semibold text-muted-foreground tracking-wider uppercase'>
                Cổng VietQR Live
              </span>
            </div>
            <DialogClose asChild>
              <button
                aria-label='Close dialog'
                className='text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors'
                type='button'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Scrollable Main Content Area */}
        <div className='flex-1 overflow-y-auto px-5 py-3.5 space-y-3'>
          {isLoading ? (
            <div className='py-16 text-center space-y-3'>
              <Loader2 className='h-8 w-8 animate-spin mx-auto text-primary' />
              <div className='text-sm font-semibold text-foreground'>
                Đang khởi tạo mã VietQR từ cổng PayOS...
              </div>
              <p className='text-xs text-muted-foreground'>
                Vui lòng đợi giây lát, hệ thống đang giữ chỗ cho bạn.
              </p>
            </div>
          ) : isConfirmed ? (
            /* --- SUCCESS STATE --- */
            <div className='space-y-4 text-center py-2'>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-6 ring-emerald-500/10'>
                <CheckCircle2 className='h-8 w-8' />
              </div>

              <div className='space-y-1'>
                <DialogHeader className='p-0 text-center'>
                  <DialogTitle className='text-foreground text-lg font-bold tracking-tight'>
                    Thanh Toán Đã Được Xác Nhận!
                  </DialogTitle>
                  <DialogDescription className='text-muted-foreground text-xs'>
                    Hệ thống đã nhận thanh toán qua PayOS • Chỗ ngồi đã được giữ chính thức
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Turnstile Pass Preview */}
              <div className='bg-muted/50 border-border/80 rounded-xl border p-3.5 text-left space-y-3'>
                <div className='flex items-center justify-between border-b border-border/60 pb-2.5'>
                  <div>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                      Vé Vào Cửa Kỹ Thuật Số
                    </span>
                    <h4 className='text-foreground font-sans text-xs sm:text-sm font-bold'>
                      {seatCode} • Không gian làm việc NexSpace
                    </h4>
                  </div>
                  <div className='bg-primary/10 text-primary border-primary/20 flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-bold'>
                    <KeyRound className='h-3 w-3' />
                    <span>PIN #{statusData?.pinCode || '8821'}</span>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  <div className='bg-card border-border flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border shadow-xs'>
                    {statusData?.qrTokenHash ? (
                      <QRCodeSVG value={statusData.qrTokenHash} size={36} />
                    ) : (
                      <NexSpaceMark className='h-7 w-7' />
                    )}
                  </div>
                  <div className='text-xs space-y-0.5'>
                    <div className='text-foreground font-semibold'>
                      Mã vé đã sẵn sàng cho cổng check-in
                    </div>
                    <div className='text-muted-foreground text-[11px] flex items-center gap-1.5'>
                      <ShieldCheck className='h-3.5 w-3.5 text-emerald-600' />
                      <span>Hóa đơn điện tử đang được xử lý gửi về email</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    if (bookingId) {
                      window.open(`/api/customer/bookings/${bookingId}/receipt/download`, '_blank');
                    }
                  }}
                  className='w-1/2 cursor-pointer h-10 text-xs font-medium border-border'
                >
                  <FileText className='mr-1.5 h-3.5 w-3.5 text-primary' />
                  Tải Hóa Đơn (PDF)
                </Button>
                <Button
                  onClick={() => {
                    handleOpenChange(false);
                    navigate({ to: '/workspaces/confirmation' });
                  }}
                  className='w-1/2 cursor-pointer h-10 text-xs font-semibold shadow-md'
                >
                  Xem Vé Điện Tử
                </Button>
              </div>
            </div>
          ) : (
            /* --- ACTIVE IN-APP VIETQR VIEW --- */
            <>
              {/* 1. Co-Branding Header */}
              <div className='flex items-center justify-between gap-2 pt-0.5'>
                <div className='flex items-center gap-2'>
                  <NexSpaceLogo variant='horizontal' className='h-6 w-auto' />
                  <ArrowRight className='h-3.5 w-3.5 text-muted-foreground/60' />
                  <div className='flex items-center gap-1.5 bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-xs'>
                    <span className='h-1.5 w-1.5 rounded-full bg-cyan-400' />
                    <span className='font-sans text-xs font-bold tracking-tight text-white'>
                      pay<span className='text-cyan-400'>OS</span>
                    </span>
                  </div>
                </div>

                <div className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium'>
                  <Lock className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
                  <span>VietQR Tự Động</span>
                </div>
              </div>

              {/* 2. Order Brief Box */}
              <div className='bg-muted/40 border-border/70 rounded-xl border p-2.5 text-xs'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-muted-foreground text-[11px]'>Mã đơn:</span>
                      <button
                        type='button'
                        onClick={() => handleCopy(displayOrderRef.replace('#', ''), 'orderRef')}
                        className='bg-card border-border/80 hover:border-primary/50 flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground transition-colors active:scale-95'
                        title='Sao chép mã đơn'
                      >
                        <span>{displayOrderRef}</span>
                        {copiedField === 'orderRef' ? (
                          <Check className='h-3 w-3 text-emerald-600' />
                        ) : (
                          <Copy className='text-muted-foreground h-3 w-3' />
                        )}
                      </button>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        secondsRemaining > 0
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      <Timer className='h-3 w-3 animate-spin [animation-duration:3s]' />
                      <span>{secondsRemaining > 0 ? `Giữ chỗ: ${timeFormatted}` : 'Hết hạn giữ chỗ'}</span>
                    </div>
                  </div>

                  <div className='text-right'>
                    <span className='text-muted-foreground text-[10px] block'>Số tiền thanh toán</span>
                    <span className='text-foreground font-sans text-base sm:text-lg font-bold tracking-tight text-primary'>
                      {displayVndAmount}
                    </span>
                    <div className='text-muted-foreground text-[10px] font-mono'>
                      ≈ {formatPrice(totalAmountUsd)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. In-App VietQR Code Container */}
              <div className='bg-muted/20 border-border/80 flex flex-col items-center justify-center rounded-xl border p-3'>
                <div className='relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white p-3 shadow-xs'>
                  {/* Top VietQR Badges */}
                  <div className='z-10 flex w-full items-center justify-between px-1 mb-1.5'>
                    <span className='rounded border border-blue-200 bg-blue-50 px-1.5 py-0.25 text-[10px] font-bold tracking-tighter text-blue-900'>
                      VietQR
                    </span>
                    <span className='rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.25 text-[9px] font-bold tracking-tight text-emerald-800'>
                      NAPAS 24/7
                    </span>
                  </div>

                  {/* Dynamic VietQR Matrix */}
                  <div className='relative my-auto flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center'>
                    {!isExpired && (
                      <div className='scanner-line absolute left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-transparent via-indigo-600 to-transparent shadow-[0_0_6px_#4F46E5] pointer-events-none' />
                    )}

                    {checkoutData?.qrCode ? (
                      <div
                        className={`relative transition-all duration-300 ${
                          isExpired ? 'blur-[6px] opacity-20 grayscale pointer-events-none select-none' : ''
                        }`}
                      >
                        <QRCodeSVG
                          value={checkoutData.qrCode}
                          size={168}
                          level='M'
                          includeMargin={false}
                        />
                        {/* NexSpace Logo Center Embed */}
                        <div className='absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white p-0.5 shadow-xs z-20 pointer-events-none'>
                          <NexSpaceMark className='h-5 w-5' />
                        </div>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs'>
                        <RefreshCw className='h-6 w-6 animate-spin text-primary' />
                        <span>Đang nạp mã QR...</span>
                      </div>
                    )}

                    {/* Expired Overlay over the QR Code */}
                    {isExpired && (
                      <div className='absolute inset-0 z-30 flex flex-col items-center justify-center p-3 text-center bg-background/85 backdrop-blur-[2px] rounded-xl border border-destructive/20 shadow-inner'>
                        <div className='h-11 w-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1.5 ring-4 ring-destructive/10'>
                          <AlertTriangle className='h-5 w-5' />
                        </div>
                        <span className='text-xs font-bold text-destructive leading-tight'>
                          Mã QR đã hết hạn
                        </span>
                        <span className='text-[10px] text-muted-foreground mt-1 line-clamp-2 px-1 leading-snug'>
                          Thời gian giữ chỗ đã kết thúc. Vị trí đã được giải phóng tự động.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Micro Status Bar */}
                  <div className='z-10 flex w-full items-center justify-center gap-1.5 border-t border-slate-100 pt-1.5 mt-2'>
                    {isExpired ? (
                      <>
                        <span className='bg-destructive h-1.5 w-1.5 rounded-full' />
                        <span className='font-mono text-[10px] font-semibold text-destructive'>
                          Phiên giao dịch đã đóng
                        </span>
                      </>
                    ) : (
                      <>
                        <span className='pulse-glow bg-indigo-600 h-1.5 w-1.5 rounded-full' />
                        <span className='font-mono text-[10px] font-semibold text-indigo-600'>
                          Đang chờ tín hiệu chuyển khoản...
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Instruction / Warning */}
                {isExpired ? (
                  <div className='mt-2.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-center w-full'>
                    <p className='text-destructive text-[11px] font-medium leading-tight flex items-center justify-center gap-1.5'>
                      <Ban className='h-3.5 w-3.5 shrink-0' />
                      <span>Vui lòng không quét mã hoặc chuyển tiền cho đơn đã hết hạn.</span>
                    </p>
                  </div>
                ) : (
                  <p className='text-muted-foreground mt-2 px-1 text-center text-[11px] leading-tight'>
                    Mở ứng dụng ngân hàng (<strong className='text-foreground font-medium'>Vietcombank, MB, Techcombank</strong>) hoặc <strong className='text-foreground font-medium'>MoMo</strong> quét mã để thanh toán tự động.
                  </p>
                )}
              </div>

              {/* 4. Manual Transfer Information Panel */}
              <div
                className={`rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2 text-xs transition-opacity ${
                  isExpired ? 'opacity-40 grayscale select-none pointer-events-none' : ''
                }`}
              >
                <div className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between'>
                  <span>Thông tin chuyển khoản thủ công</span>
                  <span className='text-[10px] text-emerald-600 font-normal lowercase'>
                    {isExpired ? 'Đã vô hiệu hóa' : 'Tự động đối soát 24/7'}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 pt-1'>
                  <div>
                    <span className='text-[10px] text-muted-foreground block'>Ngân hàng</span>
                    <span className='font-semibold text-foreground text-xs'>
                      {checkoutData?.bankName || 'MBBank'}
                    </span>
                  </div>
                  <div>
                    <span className='text-[10px] text-muted-foreground block'>Số tài khoản</span>
                    <div className='flex items-center gap-1'>
                      <span className='font-mono font-bold text-foreground text-xs'>
                        {checkoutData?.accountNumber || '0987654321'}
                      </span>
                      <button
                        type='button'
                        onClick={() => handleCopy(checkoutData?.accountNumber || '0987654321', 'accountNumber')}
                        className='text-muted-foreground hover:text-foreground cursor-pointer'
                        title='Sao chép số tài khoản'
                      >
                        {copiedField === 'accountNumber' ? (
                          <Check className='h-3 w-3 text-emerald-600' />
                        ) : (
                          <Copy className='h-3 w-3' />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 pt-1.5 border-t border-border/40'>
                  <div>
                    <span className='text-[10px] text-muted-foreground block'>Chủ tài khoản</span>
                    <span className='font-semibold text-foreground text-xs uppercase'>
                      {checkoutData?.accountName || 'NEXSPACE TECHNOLOGIES'}
                    </span>
                  </div>
                  <div>
                    <span className='text-[10px] text-muted-foreground block'>Số tiền</span>
                    <div className='flex items-center gap-1'>
                      <span className='font-mono font-bold text-primary text-xs'>
                        {displayVndAmount}
                      </span>
                      <button
                        type='button'
                        onClick={() => handleCopy(String(checkoutData?.amount || 255000), 'amount')}
                        className='text-muted-foreground hover:text-foreground cursor-pointer'
                        title='Sao chép số tiền'
                      >
                        {copiedField === 'amount' ? (
                          <Check className='h-3 w-3 text-emerald-600' />
                        ) : (
                          <Copy className='h-3 w-3' />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className='pt-1.5 border-t border-border/40'>
                  <span className='text-[10px] text-muted-foreground block'>Nội dung chuyển khoản (bắt buộc)</span>
                  <div className='flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1 mt-0.5'>
                    <span className='font-mono font-bold text-amber-700 dark:text-amber-400 text-xs'>
                      {checkoutData?.description || 'NX8821'}
                    </span>
                    <button
                      type='button'
                      onClick={() => handleCopy(checkoutData?.description || 'NX8821', 'description')}
                      className='text-amber-700 dark:text-amber-400 hover:opacity-80 cursor-pointer'
                      title='Sao chép nội dung'
                    >
                      {copiedField === 'description' ? (
                        <Check className='h-3 w-3 text-emerald-600' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                    </button>
                  </div>
                  <p className='text-[10px] text-amber-600 dark:text-amber-400 mt-1 leading-tight'>
                    * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xác nhận đơn tức thì.
                  </p>
                </div>
              </div>

              {/* Expired Action Control Buttons */}
              {isExpired && (
                <div className='space-y-2 pt-1'>
                  {onRetry && (
                    <Button
                      type='button'
                      onClick={() => {
                        handleOpenChange(false);
                        onRetry();
                      }}
                      className='w-full cursor-pointer h-10 text-xs font-semibold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2'
                    >
                      <RefreshCw className='h-3.5 w-3.5' />
                      <span>Tạo phiên mới &amp; Giữ lại chỗ</span>
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => handleOpenChange(false)}
                    className='w-full cursor-pointer h-9 text-xs font-medium border-border'
                  >
                    Đóng cửa sổ
                  </Button>
                </div>
              )}

              {/* Security Footnote */}
              <div className='border-border/60 flex items-center justify-center gap-2 border-t pt-2 text-[11px] text-muted-foreground'>
                <ShieldCheck className='h-3.5 w-3.5 text-emerald-600 shrink-0' />
                <span>
                  <strong className='text-foreground font-medium'>Mã hóa 256-bit SSL</strong> • Xác nhận đơn tự động qua Webhook
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Bottom Strip: Compliance & Dismiss */}
        <div className='bg-muted/40 border-border/60 shrink-0 space-y-1 border-t px-4 py-2 text-center'>
          <div className='text-muted-foreground flex items-center justify-center gap-1 text-[10px]'>
            <Shield className='h-3 w-3' />
            <span>Được bảo vệ bởi PayOS &amp; Napas 24/7 • Đạt chứng nhận SOC-2 Type II</span>
          </div>
          <div>
            {!isExpired ? (
              <button
                type='button'
                onClick={handleCancelCheckout}
                disabled={cancelMutation.isPending}
                className='hover:text-destructive text-muted-foreground cursor-pointer text-[10px] underline underline-offset-2 transition-colors'
              >
                {cancelMutation.isPending ? 'Đang hủy phiên...' : 'Hủy giao dịch và giải phóng giữ chỗ'}
              </button>
            ) : (
              <span className='text-[10px] text-muted-foreground'>
                Đơn đặt chỗ đã được hệ thống giải phóng tự động
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
