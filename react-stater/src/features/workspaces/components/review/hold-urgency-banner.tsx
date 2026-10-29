import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface HoldUrgencyBannerProps {
  seatCode?: string;
  initialSeconds?: number;
}

export function HoldUrgencyBanner({
  seatCode = 'Desk A-12',
  initialSeconds = 585 // 9 mins 45 seconds
}: HoldUrgencyBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const totalSeconds = 600; // 10 minutes total

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime =
    secondsRemaining > 0
      ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : '00:00 (Hold Expired)';

  const progressPercentage = Math.max(0, (secondsRemaining / totalSeconds) * 100);

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
                10-Minute Hold Active
              </span>
              <span className='inline-flex items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-500/30 dark:text-amber-300'>
                Reserved
              </span>
            </div>
            <p className='mt-0.5 text-xs text-amber-900/90 dark:text-amber-300/90 sm:text-sm'>
              Seat <span className='font-semibold text-amber-950 dark:text-amber-100'>{seatCode}</span>{' '}
              is held for you for{' '}
              <span className='font-mono font-bold tracking-wider text-amber-950 dark:text-amber-100'>
                {formattedTime}
              </span>{' '}
              minutes. Complete payment to confirm your booking.
            </p>
          </div>
        </div>

        {/* Right Verified Badge */}
        <div className='z-10 flex items-center gap-3 pl-13 sm:self-center sm:pl-0'>
          <div className='flex items-center gap-1.5 rounded-full border border-amber-300 bg-card/80 px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-xs dark:border-amber-500/30 dark:bg-card/40 dark:text-amber-300'>
            <span className='relative flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-amber-500' />
            </span>
            <span>LOCK VERIFIED</span>
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

