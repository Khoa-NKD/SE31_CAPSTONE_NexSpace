import { Link } from '@tanstack/react-router';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

interface ConfirmationBreadcrumbProps {
  orderRef?: string;
}

export function ConfirmationBreadcrumb({ orderRef = '#NX-8821' }: ConfirmationBreadcrumbProps) {
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
      <div className='flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold'>
        <CheckCircle2 className='h-3.5 w-3.5' />
        <span>Confirmation &amp; Pass ({orderRef})</span>
      </div>
    </nav>
  );
}

