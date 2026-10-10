import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

interface SeatsHeaderProps {
  totalCount?: number;
}

export function SeatsHeader({ totalCount = 18 }: SeatsHeaderProps) {
  return (
    <div className='space-y-3'>
      {/* Breadcrumb Hierarchy */}
      <nav
        aria-label='Breadcrumb'
        className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'
      >
        <Link
          to='/workspaces'
          className='hover:text-primary transition-colors duration-150'
        >
          Workspaces
        </Link>
        <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5' />
        <Link
          to='/workspaces'
          className='hover:text-primary transition-colors duration-150'
        >
          District 1, HCMC
        </Link>
        <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5' />
        <Link
          to='/workspaces/$workspaceId'
          params={{ workspaceId: '1' }}
          className='hover:text-primary transition-colors duration-150'
        >
          NexSpace Central Tower
        </Link>
        <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5' />
        <span className='text-foreground font-semibold'>Available Resources</span>
      </nav>

      {/* Page Header Title & Subtitle */}
      <div className='space-y-1'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-foreground font-sans text-2xl font-bold tracking-tight sm:text-3xl'>
            Available Seats &amp; Rooms
          </h1>
          <span className='inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'>
            <span className='relative flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
            </span>
            Live Availability Feed
          </span>
        </div>
        <p className='text-muted-foreground text-sm sm:text-base'>
          NexSpace Central Tower — Level 14 &amp; 15 •{' '}
          <strong className='text-foreground font-semibold'>
            {totalCount} resources available
          </strong>{' '}
          for your selected time slot
        </p>
      </div>
    </div>
  );
}

