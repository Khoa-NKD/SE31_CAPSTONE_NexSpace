import React from 'react';
import { MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceItem } from '../api/types';

interface WorkspaceCardProps {
  workspace: WorkspaceItem;
  onReserve: (workspace: WorkspaceItem) => void;
}

export function WorkspaceCard({ workspace, onReserve }: WorkspaceCardProps) {
  const isWarningBadge = workspace.badgeVariant === 'warning';

  return (
    <article className='custom-level-1 hover:custom-level-2 bg-card border-border/80 group flex flex-col overflow-hidden rounded-xl border transition-all duration-200'>
      {/* Thumbnail with overlay badges */}
      <div className='bg-muted relative aspect-[16/10] overflow-hidden'>
        <img
          src={workspace.imageUrl}
          alt={workspace.imageAlt}
          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          loading='lazy'
        />

        {/* Status Badge */}
        <div className='absolute top-3 left-3 flex items-center gap-2'>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isWarningBadge
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isWarningBadge ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            {workspace.badgeText}
          </span>
        </div>

        {/* Rating Badge */}
        <div className='bg-card/90 border-border/80 text-foreground absolute top-3 right-3 flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold backdrop-blur-sm'>
          <Star className='h-3.5 w-3.5 fill-amber-400 text-amber-400' />
          <span>
            {workspace.rating} ({workspace.reviewCount})
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className='flex flex-1 flex-col justify-between p-5'>
        <div>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <MapPin className='h-3.5 w-3.5 shrink-0' />
            <span className='truncate'>{workspace.location}</span>
          </div>

          <h3 className='text-foreground group-hover:text-[#4b41e1] font-display mt-1.5 text-base font-semibold tracking-tight transition-colors duration-150'>
            {workspace.title}
          </h3>

          {/* Amenities Pills */}
          <div className='mt-4 flex flex-wrap gap-2'>
            {workspace.amenities.map((amenity) => (
              <span
                key={amenity}
                className='bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-medium'
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Pricing & Reserve CTA */}
        <div className='border-border/60 mt-5 flex items-center justify-between border-t pt-4'>
          <div>
            <span className='text-foreground text-lg font-bold'>${workspace.hourlyPrice}</span>
            <span className='text-muted-foreground text-xs'>
              {workspace.dailyPrice ? ` / hour · $${workspace.dailyPrice} / day` : ' / hour'}
            </span>
          </div>

          <Button
            size='sm'
            onClick={() => onReserve(workspace)}
            className='bg-muted hover:bg-[#4b41e1] text-foreground hover:text-white cursor-pointer transition-colors duration-150'
          >
            {workspace.type === 'meeting-room' ? 'Reserve Room' : 'Reserve Seat'}
          </Button>
        </div>
      </div>
    </article>
  );
}
