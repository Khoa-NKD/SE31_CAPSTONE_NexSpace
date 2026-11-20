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
  holdDurationMinutes?: number;
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
  holdDurationMinutes,
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

  // Tổng thời lượng giữ chỗ (phút) được lấy động từ cấu hình Database (thông qua Backend API)
  const [effectiveTotalMinutes] = useState<number>(() => {
    if (holdDurationMinutes && holdDurationMinutes > 0) {
      return holdDurationMinutes;
    }
    if (initialSeconds && initialSeconds > 0) {
      return Math.max(1, Math.round(initialSeconds / 60));
    }
    const targetExpiresAt = holdExpiresAt || expiresAt;
    if (targetExpiresAt) {
      const expTime = new Date(targetExpiresAt).getTime();
      const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
      const initialDiff = Math.max(1, Math.floor((expTime - (Date.now() + offset)) / 1000));
      return Math.max(1, Math.round(initialDiff / 60));
    }
    return 10;
  });

  const maxHoldSeconds = effectiveTotalMinutes * 60;
  const initialHoldDuration = initialSeconds && initialSeconds > 0
    ? Math.min(initialSeconds, maxHoldSeconds)
    : maxHoldSeconds;

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
    : initialHoldDuration * 1000;

  const rawSecondsRemaining = Math.max(0, Math.floor(remainingMs / 1000));
  const isExpired = expiryTimestamp > 0 ? remainingMs <= 0 : rawSecondsRemaining <= 0;

  // Tổng thời gian cơ sở chuẩn hóa theo số phút chẵn từ cơ sở dữ liệu
  const totalHoldMinutes = effectiveTotalMinutes;

  // Chặn trần để không bao giờ vượt quá thời lượng cấu hình trong DB (ví dụ DB cài 7 phút thì đếm từ 07:00, DB cài 10 phút thì đếm từ 10:00)
  const secondsRemaining = Math.min(rawSecondsRemaining, maxHoldSeconds);

  // Tính phần trăm tiến trình chính xác theo mili-giây từ 100% về 0%
  const totalMs = maxHoldSeconds * 1000;
  const progressRatio = Math.min(1, Math.max(0, Math.min(remainingMs, totalMs) / totalMs));
  const progressPercentage = progressRatio * 100;

  // Thanh tiến độ chuyển 3 màu tùy mức thời gian còn lại:
  // - > 50%: Màu Xanh lá (Emerald) - Thời gian dồi dào, an tâm
  // - 20% -> 50%: Màu Vàng hổ phách (Amber) - Cảnh báo nhẹ, nhắc nhở thanh toán
  // - <= 20% hoặc <= 90s: Màu Đỏ tươi (Rose/Red) - Cảnh báo nguy cấp
  const progressBarColor =
    progressRatio <= 0.2 || secondsRemaining <= 90
      ? 'bg-rose-600 dark:bg-rose-500'
      : progressRatio <= 0.5
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-emerald-500 dark:bg-emerald-400';

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
        if (nextAttempts === 0) {
          toast.error(
            `Bạn đã dùng hết ${maxHoldAttempts} lần giữ chỗ mà không thanh toán. Tài khoản tạm thời bị khóa quyền giữ chỗ và đặt phòng/ghế trong vòng ${penaltyBlockMinutes} phút do vi phạm quy tắc.`,
            { duration: 8000 }
          );
        } else {
          toast.warning(
            `Đã hủy giữ chỗ thành công. Bạn còn ${nextAttempts} lần hủy/giữ. Nếu quá ${maxHoldAttempts} lần mà không thanh toán, tài khoản sẽ bị tạm khóa đặt chỗ trong vòng ${penaltyBlockMinutes} phút.`
          );
        }
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
      {/* Khung chính banner: Màu vàng hổ phách cảnh báo trang nhã, viền amber ấm áp */}
      <div className='relative mb-8 overflow-hidden rounded-xl border border-amber-300/90 bg-amber-50/75 p-4 shadow-xs transition-colors dark:border-amber-600/40 dark:bg-amber-950/20'>
        <div className='z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          {/* Thông tin mô tả giữ chỗ và đồng hồ đếm ngược nổi bật */}
          <div className='flex items-start gap-3.5 sm:items-center'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-100 text-amber-800 shadow-2xs dark:border-amber-700/40 dark:bg-amber-900/40 dark:text-amber-300'>
              <Timer className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs text-foreground/90 sm:text-sm leading-relaxed'>
                Vị trí <span className='font-bold text-foreground'>{seatCode}</span>{' '}
                được giữ tạm thời cho bạn trong{' '}
                <span className='inline-flex items-center justify-center min-w-[58px] px-2 py-0.5 rounded-md border border-amber-300/90 bg-white font-mono text-sm font-bold tracking-wider text-amber-950 shadow-2xs tabular-nums dark:border-amber-500/40 dark:bg-card dark:text-amber-200'>
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
                className='inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-rose-800 shadow-2xs transition-colors hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-card/50 dark:text-rose-300 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50'
              >
                <XCircle className='h-3.5 w-3.5 text-rose-600 dark:text-rose-400' />
                <span>{releaseHoldMutation.isPending ? 'Đang hủy...' : 'Hủy giữ chỗ'}</span>
              </button>
            )}

            {/* Badge KHÓA ĐÃ XÁC THỰC: Đổi màu chữ và ô trung tính tinh tế, giữ nguyên chấm tròn màu xanh lá nhấp nháy */}
            <div className='flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-[11px] font-semibold text-foreground/80 shadow-2xs dark:border-border/60 dark:bg-card/60'>
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
              </span>
              <span>KHÓA ĐÃ XÁC THỰC</span>
            </div>
          </div>
        </div>

        {/* Thông báo chính sách giữ chỗ công bằng: Thể hiện màu sắc cảnh cáo nổi bật các điểm cần chú ý */}
        <div className='mt-3.5 flex items-start gap-2.5 rounded-lg border border-amber-300/80 bg-amber-100/70 p-2.5 text-xs text-amber-950 dark:border-amber-600/40 dark:bg-amber-950/40 dark:text-amber-200'>
          <ShieldAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400' />
          <div className='flex-1 leading-relaxed'>
            <span className='font-bold text-amber-950 dark:text-amber-100'>Chính sách giữ chỗ công bằng:</span> Bạn hiện còn{' '}
            {remainingHoldAttempts <= 0 ? (
              <span className='inline-flex items-center rounded bg-rose-600 px-1.5 py-0.2 text-[11px] font-black text-white shadow-2xs'>
                0 lần (ĐÃ BỊ TẠM KHÓA)
              </span>
            ) : (
              <span className='inline-flex items-center rounded border border-amber-400/80 bg-amber-200/90 px-1.5 py-0.2 font-bold text-amber-950 underline decoration-amber-600 underline-offset-2 dark:bg-amber-900/60 dark:text-amber-100'>
                {remainingHoldAttempts} lần
              </span>
            )}{' '}
            hủy hoặc giữ chỗ. Nếu quá {maxHoldAttempts} lần mà không thanh toán, tài khoản sẽ bị phạt tạm khóa đặt chỗ trong vòng{' '}
            <span className='font-extrabold text-rose-700 underline decoration-rose-500 underline-offset-2 dark:text-rose-400'>
              {penaltyBlockMinutes} phút
            </span>. Trong vòng 24 giờ hoặc sau khi thanh toán thành công, số lần hủy/giữ sẽ được tự động thiết lập lại về ban đầu.
          </div>
        </div>

        {/* Thanh tiến độ chuyển 3 màu tùy mức: Xanh lá (>50%) -> Vàng hổ phách (20%-50%) -> Đỏ nguy cấp (<=20% hoặc <=90s) */}
        <div className='absolute right-0 bottom-0 left-0 h-1.5 bg-amber-200/60 dark:bg-amber-950/40 overflow-hidden'>
          <div
            className={`h-full transition-[width,background-color] duration-300 ease-linear will-change-[width] ${progressBarColor}`}
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
                {remainingHoldAttempts <= 1 ? (
                  <div className='mt-2 rounded-md bg-destructive/15 border border-destructive/30 p-2 text-xs font-semibold text-destructive'>
                    ⚠️ CẢNH BÁO: Đây là lần hủy cuối cùng của bạn! Nếu bấm hủy, bạn sẽ dùng hết 3 lần và tài khoản sẽ lập tức bị tạm khóa quyền đặt chỗ trong vòng {penaltyBlockMinutes} phút.
                  </div>
                ) : (
                  <p className='mt-1 text-xs text-amber-800 dark:text-amber-300'>
                    Nếu xác nhận hủy phiên này, bạn sẽ chỉ còn{' '}
                    <span className='font-bold text-amber-950 underline dark:text-amber-100'>
                      {Math.max(0, remainingHoldAttempts - 1)} lần
                    </span>.
                  </p>
                )}
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
