import { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { useReleaseHoldMutation } from '@/features/resource-availability';
import { toast } from 'sonner';

interface HoldUrgencyBannerProps {
  bookingId?: number;
  seatCode?: string;
  expiresAt?: string;
  initialSeconds?: number;
  holdExpiresAt?: string | null;
  serverTime?: string | null;
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
  onExpired,
  onReleaseSuccess
}: HoldUrgencyBannerProps) {
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [serverOffset] = useState(() => (serverTime ? new Date(serverTime).getTime() - Date.now() : 0));
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

  const handleReleaseHold = () => {
    if (!bookingId) return;
    if (confirm('Bạn có chắc chắn muốn hủy phiên giữ chỗ này để người khác có thể đặt?')) {
      releaseHoldMutation.mutate(bookingId, {
        onSuccess: () => {
          toast.success('Đã giải phóng phiên giữ chỗ thành công.');
          onReleaseSuccess?.();
        },
        onError: (err) => {
          toast.error(err.message || 'Không thể giải phóng phiên giữ chỗ.');
        }
      });
    }
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
              onClick={handleReleaseHold}
              disabled={releaseHoldMutation.isPending}
              className='inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-card/90 px-3 py-1 text-[11px] font-semibold text-amber-900 shadow-xs transition-colors hover:bg-amber-100/60 dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-200 dark:hover:bg-amber-950/40 cursor-pointer disabled:opacity-50'
            >
              <XCircle className='h-3.5 w-3.5 text-amber-700 dark:text-amber-400' />
              <span>{releaseHoldMutation.isPending ? 'Đang hủy...' : 'Hủy giữ chỗ'}</span>
            </button>
          )}

          <div className='flex items-center gap-1.5 rounded-full border border-amber-300 bg-card/80 px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-xs dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-300'>
            <span className='relative flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-amber-500' />
            </span>
            <span>KHÓA ĐÃ XÁC THỰC</span>
          </div>
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
  );
}
