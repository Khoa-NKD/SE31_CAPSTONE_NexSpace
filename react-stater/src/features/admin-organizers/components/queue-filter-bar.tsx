import React from 'react';
import { Search, Calendar, Filter, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface QueueFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'pending' | 'action_required';
  onStatusFilterChange: (status: 'all' | 'pending' | 'action_required') => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export function QueueFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange
}: QueueFilterBarProps) {
  return (
    <div className='bg-card rounded-xl border border-border p-4 mb-6 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4'>
      {/* Search Input */}
      <div className='relative w-full lg:w-96'>
        <span className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground'>
          <Search className='size-4' aria-hidden='true' />
        </span>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Filter by organizer name, MST, or App ID...'
          aria-label='Filter by organizer name, MST, or App ID'
          className='w-full h-9 pl-9 pr-4 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all'
        />
      </div>

      {/* Filter Pills & Date Range */}
      <div className='flex flex-wrap items-center gap-2.5'>
        {/* Status Pills */}
        <div className='inline-flex rounded-lg bg-muted/70 p-1 border border-border' role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All (17)
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'pending'}
            onClick={() => onStatusFilterChange('pending')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-card text-primary shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Review (12)
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'action_required'}
            onClick={() => onStatusFilterChange('action_required')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'action_required'
                ? 'bg-card text-rose-600 dark:text-rose-400 shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Action Required (5)
          </button>
        </div>

        {/* Date Range Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              className='inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border text-foreground text-xs hover:bg-muted/60 transition-colors shadow-2xs'
            >
              <Calendar className='size-3.5 text-muted-foreground' aria-hidden='true' />
              <span>Submission: <strong>{dateRange}</strong></span>
              <ChevronDown className='size-3.5 text-muted-foreground' aria-hidden='true' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuItem onClick={() => onDateRangeChange('Today')}>
              Today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange('Last 7 Days')}>
              Last 7 Days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange('Last 14 Days')}>
              Last 14 Days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange('Last 30 Days')}>
              Last 30 Days
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Filters Trigger */}
        <button
          type='button'
          className='inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-xs hover:bg-muted/60 transition-colors shadow-2xs'
        >
          <Filter className='size-3.5' aria-hidden='true' />
          <span>Filter</span>
        </button>
      </div>
    </div>
  );
}
