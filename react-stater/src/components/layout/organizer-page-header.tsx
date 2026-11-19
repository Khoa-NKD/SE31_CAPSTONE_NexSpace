import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function OrganizerPageHeader({
  title,
  description,
  icon,
  leading,
  children,
  className
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'organizer-page-header flex flex-col gap-4 rounded-2xl border border-border px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:py-5',
        className
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-3.5 sm:min-w-48'>
        {leading}
        {icon && (
          <span className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary [&_svg]:size-5'>
            {icon}
          </span>
        )}
        <div className='min-w-0'>
          <h1 className='break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl'>
            {title}
          </h1>
          {description && (
            <p className='mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
      </div>
      {children && <div className='flex flex-wrap items-center gap-2'>{children}</div>}
    </header>
  );
}
