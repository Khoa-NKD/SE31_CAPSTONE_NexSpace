import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

export function ReviewHeader() {
  return (
    <nav
      aria-label='Breadcrumb'
      className='text-muted-foreground mb-6 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 text-xs font-medium'
    >
      <Link
        to='/workspaces'
        className='hover:text-primary transition-colors duration-150'
      >
        Workspaces
      </Link>
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <Link
        to='/workspaces'
        className='hover:text-primary transition-colors duration-150'
      >
        District 1, HCMC
      </Link>
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <Link
        to='/workspaces/$workspaceId'
        params={{ workspaceId: '1' }}
        className='hover:text-primary transition-colors duration-150'
      >
        NexSpace Central Tower
      </Link>
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <Link
        to='/workspaces/seats'
        className='hover:text-primary transition-colors duration-150'
      >
        Available Resources
      </Link>
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <span className='text-foreground font-semibold'>Booking Review</span>
    </nav>
  );
}

