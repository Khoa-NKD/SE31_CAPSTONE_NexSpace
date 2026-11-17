import React from 'react';
import { Search, Calendar, Building2 } from 'lucide-react';
import { RefundStatus } from '../data/mock-refunds';

interface RefundsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | RefundStatus;
  onStatusChange: (status: 'all' | RefundStatus) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  selectedHub: string;
  onHubChange: (hub: string) => void;
  counts: {
    all: number;
    pending: number;
    processed: number;
    rejected: number;
  };
}

export function RefundsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  timeRange,
  onTimeRangeChange,
  selectedHub,
  onHubChange,
  counts
}: RefundsFilterBarProps) {
  return (
    <div className='bg-card text-card-foreground border border-border rounded-xl p-3.5 mb-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4'>
      {/* Left Filter Stack */}
      <div className='flex flex-wrap items-center gap-3 flex-1'>
        {/* Compact Search */}
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Filter current list...'
            className='w-full h-8 pl-8 pr-3 text-xs bg-muted/60 border border-input rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors'
          />
        </div>

        <div className='hidden sm:block h-5 w-[1px] bg-border' />

        {/* Status Filter Tabs */}
        <div className='flex flex-wrap items-center gap-1 text-xs'>
          <button
            type='button'
            onClick={() => onStatusChange('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All <span className='opacity-80 font-normal'>({counts.all})</span>
          </button>

          <button
            type='button'
            onClick={() => onStatusChange('pending')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
            }`}
          >
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />
            Pending Review <span className='font-bold'>({counts.pending})</span>
          </button>

          <button
            type='button'
            onClick={() => onStatusChange('processed')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'processed'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
            }`}
          >
            Processed <span className='opacity-80 font-normal'>({counts.processed})</span>
          </button>

          <button
            type='button'
            onClick={() => onStatusChange('rejected')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40 font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
            }`}
          >
            Rejected <span className='opacity-80 font-normal'>({counts.rejected})</span>
          </button>
        </div>
      </div>

      {/* Right Quick Dropdowns */}
      <div className='flex items-center gap-2.5 self-end lg:self-auto'>
        <div className='relative flex items-center'>
          <Calendar className='absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none' />
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            aria-label='Filter by time range'
            className='h-8 pl-8 pr-6 text-xs bg-background border border-input rounded-md text-foreground font-medium focus:ring-1 focus:ring-primary appearance-none cursor-pointer'
          >
            <option value='30d'>Last 30 Days</option>
            <option value='7d'>Last 7 Days</option>
            <option value='90d'>Last 90 Days</option>
            <option value='all'>All Time</option>
          </select>
        </div>

        <div className='relative flex items-center'>
          <Building2 className='absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none' />
          <select
            value={selectedHub}
            onChange={(e) => onHubChange(e.target.value)}
            aria-label='Filter by workspace hub'
            className='h-8 pl-8 pr-6 text-xs bg-background border border-input rounded-md text-foreground font-medium focus:ring-1 focus:ring-primary appearance-none cursor-pointer'
          >
            <option value='all'>All Hubs</option>
            <option value='Landmark'>Landmark Tower</option>
            <option value='Saigon Prime'>Saigon Prime</option>
            <option value='SeaView'>SeaView Hub</option>
            <option value='Westlake'>Westlake Suites</option>
          </select>
        </div>
      </div>
    </div>
  );
}
