import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookingStatus, BookingSummaryKpis } from '../data/mock-bookings';

interface BookingsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookingStatus | 'all';
  onStatusChange: (status: BookingStatus | 'all') => void;
  kpis: BookingSummaryKpis;
  onReset: () => void;
}

export function BookingsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  kpis,
  onReset
}: BookingsFilterBarProps) {
  const isFiltered = searchQuery !== '' || statusFilter !== 'all';

  return (
    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-2xs mb-6'>
      {/* Left: Search Bar */}
      <div className='relative flex-1 min-w-[280px] max-w-lg'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none'
          aria-hidden='true'
        />
        <Input
          type='text'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Filter by Booking ID (#NX-...), Customer, Workspace...'
          className='pl-9 h-10 text-xs sm:text-sm bg-background border-border shadow-none'
          aria-label='Filter bookings by ID, customer name, or workspace'
        />
      </div>

      {/* Right: Status Tabs */}
      <div className='flex flex-wrap items-center gap-3'>
        <div
          role='tablist'
          aria-label='Filter bookings by status'
          className='inline-flex p-1 bg-muted/60 rounded-lg border border-border'
        >
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'all'}
            onClick={() => onStatusChange('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({kpis.todayTotalBookings})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'confirmed'}
            onClick={() => onStatusChange('confirmed')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'confirmed'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Confirmed ({kpis.confirmedCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'checked_in'}
            onClick={() => onStatusChange('checked_in')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'checked_in'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Checked In (112)
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'completed'}
            onClick={() => onStatusChange('completed')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'completed'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed ({kpis.completedCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'cancelled'}
            onClick={() => onStatusChange('cancelled')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cancelled ({kpis.cancelledCount})
          </button>
        </div>

        {/* Reset button */}
        {isFiltered && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <RotateCcw className='size-3.5 mr-1.5' aria-hidden='true' />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
