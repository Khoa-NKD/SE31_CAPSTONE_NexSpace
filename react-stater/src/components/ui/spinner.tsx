import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './spinner.css';

type SpinnerProps = ComponentProps<'svg'> & { size?: number | string };

/** A normalized SVG dash traces an infinity path without rotating the whole icon. */
function Spinner({ className, size, children, ...props }: SpinnerProps) {
  const gradientId = `loading-gradient-${useId().replace(/:/g, '')}`;
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 32 24'
      width={size ?? 24}
      height={size ?? 24}
      fill='none'
      stroke='currentColor'
      strokeWidth={2.2}
      strokeLinecap='round'
      strokeLinejoin='round'
      role='status'
      aria-label='Đang xử lý'
      className={cn('size-4 shrink-0 ns-infinity-loader', className)}
      data-slot='spinner'
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#8b5cf6' />
          <stop offset='28%' stopColor='#c4b5fd' />
          <stop offset='55%' stopColor='#67e8f9' />
          <stop offset='78%' stopColor='#a5b4fc' />
          <stop offset='100%' stopColor='#a78bfa' />
        </linearGradient>
      </defs>
      <path
        d='M4 12C4 3 10 3 16 12S28 21 28 12S22 3 16 12S4 21 4 12'
        stroke={`url(#${gradientId})`}
        opacity={0.16}
      />
      <path
        className='ns-infinity-loader-trace'
        stroke={`url(#${gradientId})`}
        d='M4 12C4 3 10 3 16 12S28 21 28 12S22 3 16 12S4 21 4 12'
        pathLength={1}
        strokeDasharray='0.24 0.76'
      />
      {children}
    </svg>
  );
}

export { Spinner };
