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
        'flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center',
        className
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-3 sm:min-w-48'>
        {leading}
        {icon && (
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5'>
            {icon}
          </span>
        )}
        <div className='min-w-0'>
          <h1 className='break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl'>
            {title}
          </h1>
          {description && (
            <p className='mt-0.5 text-sm leading-snug text-muted-foreground'>{description}</p>
          )}
        </div>
      </div>
      {children && <div className='flex flex-wrap items-center gap-2'>{children}</div>}
    </header>
  );
}
