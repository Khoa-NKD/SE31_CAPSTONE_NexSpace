import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './aurora-text.css';

interface AuroraTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

// Adapted from Magic UI Aurora Text (MIT); see aurora-text.LICENSE.md.
export const AuroraText = memo(function AuroraText({
  children,
  className,
  colors = ['#a78bfa', '#818cf8', '#38bdf8', '#c4b5fd'],
  speed = 1
}: AuroraTextProps) {
  return (
    <span className={cn('ns-aurora-text', className)}>
      <span className='sr-only'>{children}</span>
      <span
        className='ns-aurora-text-gradient'
        style={{
          backgroundImage: `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`,
          animationDuration: `${10 / (speed > 0 ? speed : 1)}s`
        }}
        aria-hidden='true'
      >
        {children}
      </span>
    </span>
  );
});
