import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkspaceStatus, WorkspaceDirectorySummaryKpis } from '../data/mock-workspaces-directory';

interface WorkspaceDirectoryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: WorkspaceStatus | 'all';
  onStatusChange: (status: WorkspaceStatus | 'all') => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  kpis: WorkspaceDirectorySummaryKpis;
  onReset: () => void;
}

export function WorkspaceDirectoryFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedCity,
  onCityChange,
  kpis,
  onReset
}: WorkspaceDirectoryFiltersProps) {
  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || selectedCity !== 'all';

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
          placeholder='Search by Workspace Name, Hub ID (WS-...), Organizer...'
          className='pl-9 h-10 text-xs sm:text-sm bg-background border-border shadow-none'
          aria-label='Filter workspaces by name, Hub ID, or organizer'
        />
      </div>

      {/* Right: Status Tabs and City Dropdown */}
      <div className='flex flex-wrap items-center gap-3'>
        {/* Status Filter Buttons */}
        <div
          role='tablist'
          aria-label='Filter workspaces by status'
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
            All ({kpis.totalCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'pending'}
            onClick={() => onStatusChange('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Review ({kpis.pendingReviewCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'active'}
            onClick={() => onStatusChange('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'active'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({kpis.activeCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'suspended'}
            onClick={() => onStatusChange('suspended')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'suspended'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Suspended ({kpis.suspendedCount})
          </button>
        </div>

        {/* City Filter */}
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          aria-label='Filter by Metro Hub City'
          className='h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring'
        >
          <option value='all'>All Metro Hubs</option>
          <option value='Ho Chi Minh City'>Ho Chi Minh City</option>
          <option value='Hanoi'>Hanoi</option>
          <option value='Da Nang'>Da Nang</option>
        </select>

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
