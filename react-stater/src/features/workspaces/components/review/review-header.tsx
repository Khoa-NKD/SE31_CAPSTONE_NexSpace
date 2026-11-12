import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

interface ReviewHeaderProps {
  workspaceId?: number;
  workspaceName?: string;
  resourceCode?: string;
}

export function ReviewHeader({
  workspaceId,
  workspaceName,
  resourceCode
}: ReviewHeaderProps) {
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
      {workspaceId ? (
        <Link
          to='/workspaces/$workspaceId'
          params={{ workspaceId: String(workspaceId) }}
          className='hover:text-primary transition-colors duration-150 font-medium'
        >
          {workspaceName || `Workspace #${workspaceId}`}
        </Link>
      ) : (
        <span>Workspace</span>
      )}
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <Link
        to='/workspaces/seats'
        search={{ workspaceId }}
        className='hover:text-primary transition-colors duration-150'
      >
        Select Seat {resourceCode ? `(${resourceCode})` : ''}
      </Link>
      <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
      <span className='text-foreground font-semibold'>Review &amp; Hold</span>
    </nav>
  );
}
