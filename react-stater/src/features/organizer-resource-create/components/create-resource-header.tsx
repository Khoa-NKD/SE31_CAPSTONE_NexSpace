import React from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Building2, Store } from 'lucide-react';

export function CreateResourceHeader() {
  return (
    <div className='flex flex-col gap-4 pb-2'>
      {/* 1. Breadcrumbs */}
      <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto py-1'>
        <Link
          to='/dashboard/organizer/workspaces'
          className='hover:text-foreground transition-colors flex items-center gap-1.5'
        >
          <Building2 className='size-3.5' aria-hidden='true' />
          <span>Workspaces</span>
        </Link>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <span className='hover:text-foreground transition-colors cursor-pointer'>District 1, HCMC</span>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <Link
          to='/dashboard/organizer/workspaces'
          className='hover:text-foreground transition-colors'
        >
          NexSpace Saigon Prime Hub
        </Link>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <Link
          to='/dashboard/organizer/resources'
          className='hover:text-foreground transition-colors'
        >
          Resource Table
        </Link>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <span className='text-foreground font-semibold'>Create &amp; Publish Seat</span>
      </nav>

      {/* 2. Main Title Row */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border'>
        <div className='space-y-1'>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
            Create &amp; Publish Resource
          </h1>
          <p className='text-sm text-muted-foreground max-w-3xl leading-relaxed'>
            List a new bookable seat, pod, or meeting room directly onto the marketplace like an Agoda room listing.
          </p>
        </div>

        <div className='flex items-center gap-2 self-start md:self-auto'>
          <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
            <span className='size-2 rounded-full bg-emerald-500 animate-pulse' aria-hidden='true' />
            <Store className='size-3.5' aria-hidden='true' />
            <span>Marketplace Direct Listing</span>
          </span>
        </div>
      </div>
    </div>
  );
}

