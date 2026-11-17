import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Share2, Bookmark, Check } from 'lucide-react';

export function SeatDetailHeader() {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            Level 14 (Quiet Zone)
          </Link>
          <ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0' />
          <span className='text-foreground font-semibold'>Desk A-04</span>
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
            <span>{copied ? 'Copied Link' : 'Share'}</span>
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
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

