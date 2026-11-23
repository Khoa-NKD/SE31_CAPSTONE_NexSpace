import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Share2, Bookmark, Check } from '@/components/ui/hugeicons';
import type { MapResource, CustomerFloor } from '../detail/public-floor-map';
import type { PublicWorkspaceDetail } from '../../api/types';

export interface SeatDetailHeaderProps {
  resource?: MapResource | null;
  workspace?: PublicWorkspaceDetail | null;
  floor?: CustomerFloor | null;
}

export function SeatDetailHeader({ resource, workspace, floor }: SeatDetailHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const workspaceName = workspace?.name || 'Enouvo Space 1 - Dragon Bridge Hub';
  const floorName = floor?.name || 'Tầng 2 - Co-working & Hot Desks';
  const resourceCode = resource?.code || 'Desk A-04';
  const resourceName = resource?.name ? `${resource.name} (${resource.code})` : 'Desk A-04';

  return (
    <div className='w-full border-b border-border/60 bg-card py-3'>
      <div className='mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 lg:px-8'>
        {/* Breadcrumb Navigation */}
        <nav
          aria-label='Breadcrumb'
          className='text-muted-foreground flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs font-medium'
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
            {workspace?.city || 'Đà Nẵng'}
          </Link>
          <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
          <Link
            to='/workspaces/$workspaceId'
            params={{ workspaceId: String(workspace?.id || 1) }}
            className='hover:text-primary transition-colors duration-150'
          >
            {workspaceName}
          </Link>
          <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
          <Link
            to='/workspaces/seats'
            search={{ workspaceId: workspace ? Number(workspace.id) : undefined, floorId: floor?.id }}
            className='hover:text-primary transition-colors duration-150'
          >
            {floorName}
          </Link>
          <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
          <span className='text-foreground font-semibold' title={resourceName}>
            {resourceCode}
          </span>
        </nav>

        {/* Action buttons: Share & Save */}
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={handleShare}
            className='border-border hover:bg-muted text-foreground flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-95'
          >
            {copied ? (
              <Check className='h-3.5 w-3.5 text-emerald-600' />
            ) : (
              <Share2 className='h-3.5 w-3.5' />
            )}
            <span>{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
          </button>
          <button
            type='button'
            onClick={() => setSaved(!saved)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
              saved
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border text-foreground hover:bg-muted'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-primary' : ''}`} />
            <span>{saved ? 'Đã lưu' : 'Lưu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

