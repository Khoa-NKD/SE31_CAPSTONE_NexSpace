import React from 'react';
import { Link } from '@tanstack/react-router';
import { MapPin, ArrowRight, Edit, AlertTriangle, Layers, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrganizerWorkspace } from '../types';

interface WorkspaceCardProps {
  workspace: OrganizerWorkspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const isDraft = workspace.status === 'DRAFT';

  return (
    <article className='flex flex-col rounded-xl bg-card border border-border shadow-2xs overflow-hidden hover:shadow-md transition-shadow duration-200'>
      {/* Card Header (16:9 Aspect Ratio) */}
      <div className='relative w-full aspect-video bg-muted overflow-hidden'>
        {isDraft ? (
          <div className='w-full h-full bg-[#1E293B] relative flex flex-col items-center justify-center text-slate-300'>
            {/* Architectural schematic grid pattern */}
            <div
              className='absolute inset-0 opacity-20 pointer-events-none'
              style={{
                backgroundImage: 'radial-gradient(#6366F1 1.5px, transparent 1.5px)',
                backgroundSize: '16px 16px'
              }}
            />
            <div className='flex flex-col items-center gap-1.5 z-10'>
              <div className='p-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'>
                <Layers className='size-6' />
              </div>
              <span className='text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold'>
                Blueprint Staging
              </span>
            </div>
            {/* Status Overlay Badge */}
            <div className='absolute top-3 right-3 bg-amber-500/15 text-amber-500 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
              <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
              <span>DRAFT {workspace.draftProgress}%</span>
            </div>
          </div>
        ) : (
          <>
            <img
              src={workspace.imageUrl}
              alt={workspace.name}
              className='w-full h-full object-cover'
              loading='lazy'
            />
            {/* Status Overlay Badge */}
            {workspace.status === 'ACTIVE' && (
              <div className='absolute top-3 right-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
                <span className='size-1.5 rounded-full bg-emerald-500' />
                <span>ACTIVE</span>
              </div>
            )}
            {workspace.status === 'PAUSED' && (
              <div className='absolute top-3 right-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
                <span className='size-1.5 rounded-full bg-amber-500' />
                <span>PAUSED</span>
              </div>
            )}
            {workspace.status === 'MAINTENANCE' && (
              <div className='absolute top-3 right-3 bg-purple-500/15 text-purple-600 dark:text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
                <span className='size-1.5 rounded-full bg-purple-500' />
                <span>MAINTENANCE</span>
              </div>
            )}
            {workspace.status === 'ARCHIVED' && (
              <div className='absolute top-3 right-3 bg-slate-500/20 text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
                <span className='size-1.5 rounded-full bg-slate-400' />
                <span>ARCHIVED</span>
              </div>
            )}
            {workspace.status === 'UNDER_REVIEW' && (
              <div className='absolute top-3 right-3 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-sm'>
                <span className='size-1.5 rounded-full bg-indigo-500 animate-pulse' />
                <span>UNDER REVIEW</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card Body */}
      <div className='p-5 sm:p-6 flex flex-col flex-1 justify-between gap-4'>
        <div className='flex flex-col gap-1.5'>
          <h2 className='text-base sm:text-lg font-semibold text-foreground leading-snug line-clamp-1'>
            {workspace.name}
          </h2>
          <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
            <MapPin className='size-3.5 shrink-0 text-muted-foreground/80' />
            <span className='truncate'>{workspace.address}</span>
          </div>
        </div>

        {isDraft ? (
          <>
            {/* Missing Items Warning Banner */}
            {workspace.draftWarningMessage && (
              <div className='bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5'>
                <AlertTriangle className='size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
                <span className='leading-relaxed font-medium'>{workspace.draftWarningMessage}</span>
              </div>
            )}

            {/* Setup Progress Bar */}
            <div className='flex flex-col gap-1.5 pt-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Setup completion</span>
                <span className='text-amber-600 dark:text-amber-400 font-bold'>
                  {workspace.draftProgress}%
                </span>
              </div>
              <div className='w-full bg-muted h-2 rounded-full overflow-hidden'>
                <div
                  className='bg-amber-500 h-full rounded-full transition-all duration-500'
                  style={{ width: `${workspace.draftProgress ?? 80}%` }}
                />
              </div>
            </div>

            {/* Action Button: Resume Setup */}
            <Button
              variant='outline'
              asChild
              className='w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-400 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm'
            >
              <Link to='/dashboard/organizer/workspaces/create'>
                <Edit className='size-3.5' />
                <span>Resume Setup</span>
              </Link>
            </Button>
          </>
        ) : (
          <>
            {/* Mini Stats Row */}
            <div className='grid grid-cols-3 divide-x divide-border bg-muted/40 rounded-lg border border-border py-2.5 px-1.5 text-center'>
              <div className='flex flex-col'>
                <span className='text-sm sm:text-base font-bold text-foreground'>
                  {workspace.desksCount}
                </span>
                <span className='text-[11px] text-muted-foreground'>Desks</span>
              </div>
              <div className='flex flex-col'>
                <span className='text-sm sm:text-base font-bold text-foreground'>
                  {workspace.meetingRoomsCount}
                </span>
                <span className='text-[11px] text-muted-foreground'>Rooms</span>
              </div>
              <div className='flex flex-col'>
                <span className='text-sm sm:text-base font-bold text-foreground flex items-center justify-center gap-0.5'>
                  <Star className='size-3 text-amber-500 fill-amber-500' />
                  <span>{workspace.rating}</span>
                </span>
                <span className='text-[11px] text-muted-foreground'>
                  {workspace.reviewsCount ? `${workspace.reviewsCount} reviews` : 'Rating'}
                </span>
              </div>
            </div>

            {/* Occupancy Progress Bar */}
            <div className='flex flex-col gap-1.5 pt-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Current Occupancy</span>
                <span className='text-emerald-600 dark:text-emerald-400 font-bold'>
                  {workspace.occupancyRate}%
                </span>
              </div>
              <div className='w-full bg-muted h-2 rounded-full overflow-hidden'>
                <div
                  className='bg-emerald-500 h-full rounded-full transition-all duration-500'
                  style={{ width: `${workspace.occupancyRate}%` }}
                />
              </div>
            </div>

            {/* Action Button: Manage Workspace */}
            <Button
              variant='outline'
              asChild
              className='w-full border-border hover:bg-muted text-foreground font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm'
            >
              <Link to='/dashboard/organizer/workspaces/lifecycle' search={{ id: workspace.id }}>
                <span>Manage Workspace</span>
                <ArrowRight className='size-3.5' />
              </Link>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
