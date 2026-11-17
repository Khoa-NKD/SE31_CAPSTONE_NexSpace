import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import React from 'react';
import { Link } from '@tanstack/react-router';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WizardHeaderProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

export function WizardHeader({ currentStep }: WizardHeaderProps) {
  const c = useOrganizerCopy();
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-border'>
      {/* Breadcrumb & Step Badge */}
      <div className='flex items-center gap-2 sm:gap-3 text-xs sm:text-sm'>
        <nav
          aria-label={c('Breadcrumb', 'Điều hướng')}
          className='flex items-center gap-1.5 text-muted-foreground'
        >
          <Link
            to='/dashboard/organizer/workspaces'
            className='hover:text-foreground transition-colors'
          >
            {c('Home', 'Trang chủ')}
          </Link>
          <ChevronRight className='size-3 text-border' />
          <Link
            to='/dashboard/organizer/workspaces'
            className='hover:text-foreground transition-colors'
          >
            {c('Workspaces', 'Không gian')}
          </Link>
          <ChevronRight className='size-3 text-border' />
          <span className='font-semibold text-foreground'>
            {c('Create Workspace', 'Tạo không gian')}
          </span>
        </nav>

        <Badge
          variant='secondary'
          className='bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold tracking-wide ml-1'
        >
          {c('Step', 'Bước')} {currentStep} {c('of 4', 'trên 4')}
        </Badge>
      </div>

      {/* Exit Wizard CTA */}
      <Button
        variant='ghost'
        size='sm'
        asChild
        className='text-muted-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm gap-1.5'
      >
        <Link to='/dashboard/organizer/workspaces'>
          <X className='size-4' />
          <span>{c('Exit Wizard', 'Thoát thiết lập')}</span>
        </Link>
      </Button>
    </div>
  );
}
