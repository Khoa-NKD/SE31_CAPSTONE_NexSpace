import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

/** Preserve reserved content dimensions while showing the shared loading visual. */
export function LoadingPlaceholder({
  children,
  className,
  as: Tag = 'div',
  ...props
}: ComponentProps<'div'> & { as?: 'div' | 'main' }) {
  return (
    <Tag className={cn('relative', className)} role='status' aria-label='Đang tải' {...props}>
      {children}
      <span className='pointer-events-none absolute inset-0 flex items-center justify-center text-primary'>
        <Spinner className='size-6 max-h-[80%] max-w-[80%]' aria-hidden='true' />
      </span>
    </Tag>
  );
}
