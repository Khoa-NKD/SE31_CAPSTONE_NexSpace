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
  initialSeconds = 600,
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

  const releaseHoldMutation = useReleaseHoldMutation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const expiryTimestamp = effectiveExpiresAt ? new Date(effectiveExpiresAt).getTime() : 0;
  const secondsRemaining = expiryTimestamp > 0
    ? Math.max(0, Math.floor((expiryTimestamp - (currentTimestamp + serverOffset)) / 1000))
    : initialSeconds;

  const isExpired = secondsRemaining <= 0;

  useEffect(() => {
    if (isExpired && !expiredNotifiedRef.current) {
      expiredNotifiedRef.current = true;
      onExpired?.();
      toast.warning('Phiên giữ chỗ của bạn đã hết hạn do quá 10 phút. Chỗ ngồi đã được tự động giải phóng.');
    }
  }, [isExpired, onExpired]);

  const handleConfirmRelease = () => {
    if (!bookingId) return;
    releaseHoldMutation.mutate(bookingId, {
      onSuccess: () => {
        setIsConfirmDialogOpen(false);
        toast.success('Đã giải phóng phiên giữ chỗ thành công.');
        onReleaseSuccess?.();
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
      : '00:00 (Hết hạn)';

  const baseTotalSeconds = Math.max(initialSeconds || 600, secondsRemaining, 600);
  const progressPercentage = Math.min(100, Math.max(0, (secondsRemaining / baseTotalSeconds) * 100));

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
                đã hết thời gian giữ chỗ 10 phút và được giải phóng tự động để đảm bảo công bằng cho người dùng khác. Vui lòng quay lại chọn lại chỗ ngồi.
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
      <div className='relative mb-8 overflow-hidden rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10'>
        <div className='z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          {/* Left Information */}
          <div className='flex items-start gap-3.5 sm:items-center'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'>
              <Timer className='h-5 w-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-sans text-base font-bold text-amber-950 dark:text-amber-200'>
                  {secondsRemaining > 0
                    ? `Đang giữ chỗ (${Math.max(1, Math.ceil(secondsRemaining / 60))} phút)`
                    : 'Hết hạn'}
                </span>
                <span className='inline-flex items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-500/30 dark:text-amber-300'>
                  TẠM GIỮ
                </span>
              </div>
              <p className='mt-0.5 text-xs text-amber-900/90 dark:text-amber-300/90 sm:text-sm'>
                Vị trí <span className='font-semibold text-amber-950 dark:text-amber-100'>{seatCode}</span>{' '}
                được giữ tạm thời cho bạn trong{' '}
                <span className='font-mono font-bold tracking-wider text-amber-950 dark:text-amber-100'>
                  {formattedTime}
                </span>
                . Vui lòng hoàn tất thanh toán trước khi hết hạn để xác nhận đặt chỗ.
              </p>
            </div>
          </div>

          {/* Right Actions: Lock Verified & Manual Release Button */}
          <div className='z-10 flex flex-wrap items-center gap-2.5 pl-13 sm:self-center sm:pl-0'>
            {bookingId && (
              <button
                type='button'
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={releaseHoldMutation.isPending}
                className='inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-amber-900 shadow-xs transition-colors hover:bg-amber-100/60 dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-200 dark:hover:bg-amber-950/40 cursor-pointer disabled:opacity-50'
              >
                <XCircle className='h-3.5 w-3.5 text-amber-700 dark:text-amber-400' />
                <span>{releaseHoldMutation.isPending ? 'Đang hủy...' : 'Hủy giữ chỗ'}</span>
              </button>
            )}

            <div className='flex items-center gap-1.5 rounded-full border border-amber-300 bg-card/80 px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-xs dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-300'>
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-amber-500' />
              </span>
              <span>KHÓA ĐÃ XÁC THỰC</span>
            </div>
          </div>
        </div>

        {/* Thông báo nổi bật bên dưới bộ đếm ngược về chính sách phạt spam hold */}
        <div className='mt-3.5 flex items-start gap-2.5 rounded-lg border border-amber-300/80 bg-amber-100/70 p-2.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200'>
          <ShieldAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400' />
          <div className='flex-1 leading-relaxed'>
            <span className='font-semibold'>Chính sách giữ chỗ công bằng:</span> Bạn hiện còn{' '}
            <span className='font-bold text-amber-900 underline decoration-amber-500 underline-offset-2 dark:text-amber-100'>
              {remainingHoldAttempts} lần
            </span>{' '}
            hủy hoặc giữ chỗ. Nếu quá {maxHoldAttempts} lần mà không thanh toán, tài khoản sẽ bị phạt tạm khóa đặt chỗ trong vòng{' '}
            <span className='font-bold'>{penaltyBlockMinutes} phút</span>. Trong vòng 24 giờ hoặc sau khi thanh toán thành công, số lần hủy/giữ sẽ được tự động thiết lập lại về ban đầu.
          </div>
        </div>

        {/* Dynamic Animated Progress Bar */}
        <div className='absolute right-0 bottom-0 left-0 h-1 bg-amber-200/50 dark:bg-amber-950/40'>
          <div
            className='h-full bg-amber-500 transition-all duration-1000 dark:bg-amber-400'
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Pop-up Xác nhận khi người dùng bấm Hủy giữ chỗ */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-amber-900 dark:text-amber-200'>
              <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400' />
              <span>Xác nhận hủy phiên giữ chỗ</span>
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2 text-sm text-foreground/80 leading-relaxed pt-2'>
              <p>
                Bạn hiện còn <span className='font-bold text-amber-950 underline dark:text-amber-200'>{remainingHoldAttempts} lượt</span> để hủy.
              </p>
              <p>
                Nếu bạn sử dụng hết {maxHoldAttempts} lượt này mà không thanh toán, tài khoản sẽ bị tạm khóa không cho đặt chỗ trong vòng <span className='font-semibold text-red-600 dark:text-red-400'>{penaltyBlockMinutes} phút</span> do nghi vấn có hành vi spam giữ chỗ.
              </p>
              <p className='font-medium text-foreground pt-1'>
                Bạn có chắc chắn muốn hủy phiên giữ chỗ này không?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0 pt-2'>
            <AlertDialogCancel disabled={releaseHoldMutation.isPending} className='cursor-pointer'>
              Không, giữ lại chỗ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRelease}
              disabled={releaseHoldMutation.isPending}
              className='bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 cursor-pointer'
            >
              {releaseHoldMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
