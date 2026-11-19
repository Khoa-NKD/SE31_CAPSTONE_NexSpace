import { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, XCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { useReleaseHoldMutation } from '@/features/resource-availability';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface HoldUrgencyBannerProps {
  bookingId?: number;
  seatCode?: string;
  expiresAt?: string;
  initialSeconds?: number;
  holdExpiresAt?: string | null;
  serverTime?: string | null;
  remainingHoldAttempts?: number;
  maxHoldAttempts?: number;
  penaltyBlockMinutes?: number;
  onExpired?: () => void;
  onReleaseSuccess?: () => void;
}

export function HoldUrgencyBanner({
  bookingId,
  seatCode = 'Selected Station',
  expiresAt,
  initialSeconds,
  holdExpiresAt,
  serverTime,
  remainingHoldAttempts = 3,
  maxHoldAttempts = 3,
  penaltyBlockMinutes = 20,
  onExpired,
  onReleaseSuccess
}: HoldUrgencyBannerProps) {
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [serverOffset] = useState(() => (serverTime ? new Date(serverTime).getTime() - Date.now() : 0));
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const effectiveExpiresAt = holdExpiresAt || expiresAt;
  const expiredNotifiedRef = useRef(false);

  // Khởi tạo tổng thời gian ban đầu của phiên giữ chỗ (đồng bộ với DB, không fix cứng 600s/10p)
  const [initialHoldDuration] = useState<number>(() => {
    if (initialSeconds && initialSeconds > 0) {
      return initialSeconds;
    }
    const targetExpiresAt = holdExpiresAt || expiresAt;
    if (targetExpiresAt) {
      const expTime = new Date(targetExpiresAt).getTime();
      const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
      const initialDiff = Math.ceil((expTime - (Date.now() + offset)) / 1000);
      return Math.max(initialDiff, 1);
    }
    return 600;
  });

  const releaseHoldMutation = useReleaseHoldMutation();

  // Cập nhật timer tần số cao (100ms) kết hợp CSS linear transition để thanh thời gian trượt siêu mượt mà
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const expiryTimestamp = effectiveExpiresAt ? new Date(effectiveExpiresAt).getTime() : 0;

  // Tính mili-giây còn lại chính xác cao
  const remainingMs = expiryTimestamp > 0
    ? Math.max(0, expiryTimestamp - (currentTimestamp + serverOffset))
    : (initialSeconds ?? 600) * 1000;

  const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
  const isExpired = expiryTimestamp > 0 ? remainingMs <= 0 : secondsRemaining <= 0;

  // Tổng thời gian cơ sở (nếu server gia hạn hold dài hơn ban đầu, tự động mở rộng theo secondsRemaining)
  const baseTotalSeconds = Math.max(initialHoldDuration, secondsRemaining, 1);
  const totalHoldMinutes = Math.max(1, Math.round(baseTotalSeconds / 60));

  // Tính phần trăm tiến trình chính xác theo mili-giây từ 100% về 0%
  const totalMs = baseTotalSeconds * 1000;
  const progressRatio = Math.min(1, Math.max(0, remainingMs / totalMs));
  const progressPercentage = progressRatio * 100;

  // Xác định chủ đề màu sắc động (Dynamic Multi-Color Theme) theo mức độ khẩn cấp:
  // - > 50% thời gian: Màu Xanh Ngọc (Emerald) - Thời gian an toàn
  // - 20% -> 50% thời gian: Màu Vàng Hổ Phách (Amber) - Cảnh báo vừa
  // - <= 20% hoặc <= 90s: Màu Đỏ (Rose/Red) - Cảnh báo nguy cấp
  const urgencyLevel: 'safe' | 'warning' | 'danger' =
    progressRatio <= 0.2 || secondsRemaining <= 90
      ? 'danger'
      : progressRatio <= 0.5
        ? 'warning'
        : 'safe';

  const themeConfig = {
    safe: {
      container: 'border-emerald-300 bg-emerald-50/75 dark:border-emerald-500/30 dark:bg-emerald-500/10',
      iconBox: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      timerBadge: 'bg-emerald-100/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500/30',
      policyBox: 'border-emerald-300/80 bg-emerald-100/70 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200',
      policyIcon: 'text-emerald-700 dark:text-emerald-400',
      policyHighlight: 'text-emerald-900 decoration-emerald-500 dark:text-emerald-100',
      progressBarBg: 'bg-emerald-200/50 dark:bg-emerald-950/40',
      progressBarFill: 'bg-emerald-600 dark:bg-emerald-400',
      pingDot: 'bg-emerald-500',
      pingPing: 'bg-emerald-400',
      lockBadge: 'border-emerald-300 bg-card/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-card/40 dark:text-emerald-300',
      button: 'border-emerald-300/80 text-emerald-900 hover:bg-emerald-100/60 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-950/40',
      buttonIcon: 'text-emerald-700 dark:text-emerald-400'
    },
    warning: {
      container: 'border-amber-300 bg-amber-50/75 dark:border-amber-500/30 dark:bg-amber-500/10',
      iconBox: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      timerBadge: 'bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-500/30',
      policyBox: 'border-amber-300/80 bg-amber-100/70 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200',
      policyIcon: 'text-amber-700 dark:text-amber-400',
      policyHighlight: 'text-amber-900 decoration-amber-500 dark:text-amber-100',
      progressBarBg: 'bg-amber-200/50 dark:bg-amber-950/40',
      progressBarFill: 'bg-amber-500 dark:bg-amber-400',
      pingDot: 'bg-amber-500',
      pingPing: 'bg-amber-400',
      lockBadge: 'border-amber-300 bg-card/80 text-amber-800 dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-300',
      button: 'border-amber-300/80 text-amber-900 hover:bg-amber-100/60 dark:border-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-950/40',
      buttonIcon: 'text-amber-700 dark:text-amber-400'
    },
    danger: {
      container: 'border-rose-400 bg-rose-50/80 dark:border-rose-500/40 dark:bg-rose-500/15 animate-pulse-subtle',
      iconBox: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
      timerBadge: 'bg-rose-100/90 text-rose-900 border-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-500/40 font-black',
      policyBox: 'border-rose-300/80 bg-rose-100/70 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200',
      policyIcon: 'text-rose-700 dark:text-rose-400',
      policyHighlight: 'text-rose-950 decoration-rose-500 dark:text-rose-100',
      progressBarBg: 'bg-rose-200/50 dark:bg-rose-950/40',
      progressBarFill: 'bg-rose-600 dark:bg-rose-500',
      pingDot: 'bg-rose-600',
      pingPing: 'bg-rose-500',
      lockBadge: 'border-rose-300 bg-card/80 text-rose-800 dark:border-rose-500/30 dark:bg-card/40 dark:text-rose-300',
      button: 'border-rose-300/80 text-rose-900 hover:bg-rose-100/60 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-950/40',
      buttonIcon: 'text-rose-700 dark:text-rose-400'
    }
  }[urgencyLevel];

  useEffect(() => {
    if (isExpired && !expiredNotifiedRef.current) {
      expiredNotifiedRef.current = true;
      onExpired?.();
      toast.warning(`Phiên giữ chỗ của bạn đã hết hạn do quá ${totalHoldMinutes} phút. Chỗ ngồi đã được tự động giải phóng.`);
    }
  }, [isExpired, onExpired, totalHoldMinutes]);

  const handleConfirmRelease = () => {
    if (!bookingId) return;
    const nextAttempts = Math.max(0, remainingHoldAttempts - 1);
    releaseHoldMutation.mutate(bookingId, {
      onSuccess: () => {
        setIsConfirmDialogOpen(false);
        toast.warning(
          `Đã hủy giữ chỗ thành công. Bạn còn ${nextAttempts} lần hủy/giữ. Nếu quá ${maxHoldAttempts} lần mà không thanh toán, tài khoản sẽ bị tạm khóa ${penaltyBlockMinutes} phút.`
        );
        setTimeout(() => {
          onReleaseSuccess?.();
        }, 800);
      },
      onError: (err) => {
        setIsConfirmDialogOpen(false);
        toast.error(err.message || 'Không thể giải phóng phiên giữ chỗ.');
      }
    });
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime =
    secondsRemaining > 0
      ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : '00:00';

  if (isExpired) {
    return (
      <div className='relative mb-8 overflow-hidden rounded-xl border border-red-300 bg-red-50/80 p-4 shadow-xs dark:border-red-500/30 dark:bg-red-500/10'>
        <div className='z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <div className='flex items-start gap-3.5 sm:items-center'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'>
              <AlertTriangle className='h-5 w-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-sans text-base font-bold text-red-950 dark:text-red-200'>
                  Phiên giữ chỗ đã hết hạn
                </span>
                <span className='inline-flex items-center rounded-full bg-red-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-900 dark:bg-red-500/30 dark:text-red-300'>
                  ĐÃ GIẢI PHÓNG
                </span>
              </div>
              <p className='mt-0.5 text-xs text-red-900/90 dark:text-red-300/90 sm:text-sm'>
                Chỗ <span className='font-semibold text-red-950 dark:text-red-100'>{seatCode}</span>{' '}
                đã hết thời gian giữ chỗ {totalHoldMinutes} phút và được giải phóng tự động để đảm bảo công bằng cho người dùng khác. Vui lòng quay lại chọn lại chỗ ngồi.
              </p>
            </div>
          </div>

          <div className='z-10 flex items-center gap-2 pl-13 sm:self-center sm:pl-0'>
            <button
              type='button'
              onClick={() => window.history.back()}
              className='inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-card px-3.5 py-1.5 text-xs font-semibold text-red-800 shadow-xs transition-colors hover:bg-red-50 dark:border-red-500/30 dark:bg-card/60 dark:text-red-300 dark:hover:bg-red-950/40 cursor-pointer'
            >
              <RotateCcw className='h-3.5 w-3.5' />
              <span>Chọn lại chỗ khác</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative mb-8 overflow-hidden rounded-xl border p-4 shadow-xs transition-colors duration-500 ${themeConfig.container}`}>
        <div className='z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          {/* Thông tin mô tả giữ chỗ và đồng hồ đếm ngược (đã bỏ tiêu đề 'Đang giữ chỗ X phút' và badge 'TẠM GIỮ') */}
          <div className='flex items-start gap-3.5 sm:items-center'>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${themeConfig.iconBox}`}>
              <Timer className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs text-foreground/90 sm:text-sm leading-relaxed'>
                Vị trí <span className='font-bold text-foreground'>{seatCode}</span>{' '}
                được giữ tạm thời cho bạn trong{' '}
                <span className={`inline-flex items-center justify-center min-w-[58px] px-1.5 py-0.5 rounded border font-mono text-sm font-bold tracking-wider tabular-nums transition-colors duration-300 ${themeConfig.timerBadge}`}>
                  {formattedTime}
                </span>
                . Vui lòng hoàn tất thanh toán trước khi hết hạn để xác nhận đặt chỗ.
              </p>
            </div>
          </div>

          {/* Right Actions: Hủy giữ chỗ & Badge xác thực */}
          <div className='z-10 flex flex-wrap items-center gap-2.5 pl-13 sm:self-center sm:pl-0'>
            {bookingId && (
              <button
                type='button'
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={releaseHoldMutation.isPending}
                className={`inline-flex items-center gap-1.5 rounded-lg border bg-card/90 px-3 py-1.5 text-[11px] font-semibold shadow-xs transition-colors duration-300 dark:bg-card/40 cursor-pointer disabled:opacity-50 ${themeConfig.button}`}
              >
                <XCircle className={`h-3.5 w-3.5 ${themeConfig.buttonIcon}`} />
                <span>{releaseHoldMutation.isPending ? 'Đang hủy...' : 'Hủy giữ chỗ'}</span>
              </button>
            )}

            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-xs transition-colors duration-300 dark:bg-card/40 ${themeConfig.lockBadge}`}>
              <span className='relative flex h-2 w-2'>
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${themeConfig.pingPing}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${themeConfig.pingDot}`} />
              </span>
              <span>KHÓA ĐÃ XÁC THỰC</span>
            </div>
          </div>
        </div>

        {/* Thông báo chính sách giữ chỗ công bằng */}
        <div className={`mt-3.5 flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors duration-500 ${themeConfig.policyBox}`}>
          <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 transition-colors duration-300 ${themeConfig.policyIcon}`} />
          <div className='flex-1 leading-relaxed'>
            <span className='font-semibold'>Chính sách giữ chỗ công bằng:</span> Bạn hiện còn{' '}
            <span className={`font-bold underline underline-offset-2 ${themeConfig.policyHighlight}`}>
              {remainingHoldAttempts} lần
            </span>{' '}
            hủy hoặc giữ chỗ. Nếu quá {maxHoldAttempts} lần mà không thanh toán, tài khoản sẽ bị phạt tạm khóa đặt chỗ trong vòng{' '}
            <span className='font-bold'>{penaltyBlockMinutes} phút</span>. Trong vòng 24 giờ hoặc sau khi thanh toán thành công, số lần hủy/giữ sẽ được tự động thiết lập lại về ban đầu.
          </div>
        </div>

        {/* Dynamic Animated Progress Bar: trượt siêu mượt (100ms ease-linear), đa dạng dải màu sắc */}
        <div className={`absolute right-0 bottom-0 left-0 h-1.5 overflow-hidden transition-colors duration-500 ${themeConfig.progressBarBg}`}>
          <div
            className={`h-full transition-[width] duration-100 ease-linear will-change-[width] ${themeConfig.progressBarFill}`}
            style={{ width: `${progressPercentage.toFixed(2)}%` }}
          />
        </div>
      </div>

      {/* Pop-up Xác nhận khi người dùng bấm Hủy giữ chỗ */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-destructive dark:text-rose-400'>
              <AlertTriangle className='h-5 w-5 text-destructive dark:text-rose-400' />
              <span>Xác nhận hủy phiên giữ chỗ</span>
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2 text-sm text-foreground/90 leading-relaxed pt-2'>
              <div className='rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200'>
                <p className='font-medium'>
                  Bạn hiện còn <span className='font-bold text-amber-900 underline dark:text-amber-100'>{remainingHoldAttempts} lần</span> hủy giữ chỗ.
                </p>
                <p className='mt-1 text-xs text-amber-800 dark:text-amber-300'>
                  Nếu xác nhận hủy phiên này, bạn sẽ chỉ còn{' '}
                  <span className='font-bold text-amber-950 underline dark:text-amber-100'>
                    {Math.max(0, remainingHoldAttempts - 1)} lần
                  </span>.
                </p>
              </div>
              <p className='text-xs text-muted-foreground pt-1'>
                <span className='font-semibold text-destructive'>Lưu ý:</span> Nếu bạn hủy hoặc để phiên giữ chỗ hết hạn quá <span className='font-semibold'>{maxHoldAttempts} lần</span> mà không hoàn tất thanh toán, tài khoản sẽ bị <span className='font-bold text-destructive'>TẠM KHÓA đặt chỗ trong vòng {penaltyBlockMinutes} phút</span> (tức là không thể đặt bất kỳ chỗ nào trong {penaltyBlockMinutes} phút tới).
              </p>
              <p className='font-medium text-foreground pt-1'>
                Bạn có chắc chắn muốn hủy phiên giữ chỗ này không?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0 pt-2'>
            <AlertDialogCancel disabled={releaseHoldMutation.isPending} className='cursor-pointer'>
              Không, tiếp tục giữ chỗ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRelease}
              disabled={releaseHoldMutation.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer'
            >
              {releaseHoldMutation.isPending ? 'Đang hủy...' : 'Đồng ý hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
