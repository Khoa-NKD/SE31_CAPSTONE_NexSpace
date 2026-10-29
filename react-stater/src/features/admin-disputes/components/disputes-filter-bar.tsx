import React from 'react';
import { Search, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DisputeSeverity, DisputeStatus, DisputesSummaryKpis } from '../data/mock-disputes';

interface DisputesFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  severityFilter: 'all' | DisputeSeverity;
  onSeverityChange: (severity: 'all' | DisputeSeverity) => void;
  statusFilter: 'all' | DisputeStatus;
  onStatusChange: (status: 'all' | DisputeStatus) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  kpis: DisputesSummaryKpis;
  onRefresh: () => void;
}

export function DisputesFilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  timeRange,
  onTimeRangeChange,
  kpis,
  onRefresh
}: DisputesFilterBarProps) {
  return (
    <div className='space-y-4 mb-4'>
      {/* Top Header Summary KPI Pills */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-xs text-muted-foreground'>
          Investigate submitted evidence, verify terms of service violations, and record binding adjudication.
        </div>

        <div className='flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border shadow-xs'>
          <div className='flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border'>
            <span className='text-muted-foreground text-xs'>Open Cases:</span>
            <span className='font-bold text-foreground text-xs'>{kpis.openCases}</span>
          </div>
          <div className='flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30'>
            <span className='text-amber-700 dark:text-amber-400 text-xs'>Under Investigation:</span>
            <span className='font-bold text-amber-800 dark:text-amber-300 text-xs'>
              {kpis.underInvestigation}
            </span>
          </div>
          <div className='flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/30'>
            <span className='text-red-700 dark:text-red-400 text-xs'>High Priority:</span>
            <span className='font-bold text-red-800 dark:text-red-300 text-xs'>
              {kpis.highPriority}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Filter Control Box */}
      <div className='bg-card text-card-foreground p-3.5 rounded-lg border border-border shadow-sm space-y-3'>
        {/* Primary Row */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {/* Left: Search & Category Pills */}
          <div className='flex flex-wrap items-center gap-2'>
            {/* Inline Search */}
            <div className='relative w-full sm:w-60'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder='Filter cases by keyword...'
                className='w-full pl-8 pr-9 py-1 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary'
              />
              <span className='absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground px-1 bg-muted rounded border border-border pointer-events-none'>
                ⌘F
              </span>
            </div>

            <div className='hidden sm:block h-6 w-[1px] bg-border' />

            {/* Case Category Pills */}
            <div className='inline-flex rounded border border-input p-0.5 bg-muted/60 text-xs'>
              <button
                type='button'
                onClick={() => onCategoryChange('all')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type='button'
                onClick={() => onCategoryChange('facility')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  categoryFilter === 'facility'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Facility Issue
              </button>
              <button
                type='button'
                onClick={() => onCategoryChange('noise')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  categoryFilter === 'noise'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Noise Complaint
              </button>
              <button
                type='button'
                onClick={() => onCategoryChange('damage')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  categoryFilter === 'damage'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Damage Claim
              </button>
            </div>

            {/* Severity Select */}
            <div className='relative'>
              <select
                value={severityFilter}
                onChange={(e) => onSeverityChange(e.target.value as 'all' | DisputeSeverity)}
                aria-label='Filter by case severity'
                className='h-7.5 px-2.5 py-1 bg-background border border-input rounded text-xs text-foreground focus:ring-1 focus:ring-primary cursor-pointer'
              >
                <option value='all'>Severity: All</option>
                <option value='critical'>Critical / Urgent</option>
                <option value='high'>High</option>
                <option value='normal'>Normal</option>
              </select>
            </div>
          </div>

          {/* Right: Date Range & Refresh */}
          <div className='flex items-center gap-2'>
            <div className='relative flex items-center'>
              <Calendar className='absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none' />
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                aria-label='Filter by time range'
                className='h-7.5 pl-8 pr-6 text-xs bg-background border border-input rounded text-foreground font-medium focus:ring-1 focus:ring-primary appearance-none cursor-pointer'
              >
                <option value='7d'>Past 7 Days (Jan 19 - 25)</option>
                <option value='30d'>Past 30 Days</option>
                <option value='all'>All Time</option>
              </select>
            </div>

            <button
              type='button'
              onClick={() => {
                onRefresh();
                toast.info('Cases Refreshed', { description: 'Dispute queue synchronized.' });
              }}
              aria-label='Refresh dispute cases queue'
              className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded border border-input transition-colors'
              title='Refresh Queue'
            >
              <RefreshCw className='size-3.5' />
            </button>
          </div>
        </div>

        {/* Secondary Lifecycle Status Row */}
        <div className='flex flex-wrap items-center justify-between border-t border-border pt-2.5 text-xs gap-2'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-muted-foreground mr-1 font-medium'>Lifecycle State:</span>
            <button
              type='button'
              onClick={() => onStatusChange('all')}
              className={`px-2.5 py-0.5 rounded-full transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All (5)
            </button>
            <button
              type='button'
              onClick={() => onStatusChange('open')}
              className={`px-2.5 py-0.5 rounded-full transition-colors ${
                statusFilter === 'open'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Open (2)
            </button>
            <button
              type='button'
              onClick={() => onStatusChange('under_investigation')}
              className={`px-2.5 py-0.5 rounded-full transition-colors ${
                statusFilter === 'under_investigation'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Under Investigation (2)
            </button>
            <button
              type='button'
              onClick={() => onStatusChange('resolved')}
              className={`px-2.5 py-0.5 rounded-full transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Resolved (38)
            </button>
            <button
              type='button'
              onClick={() => onStatusChange('dismissed')}
              className={`px-2.5 py-0.5 rounded-full transition-colors ${
                statusFilter === 'dismissed'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Dismissed (4)
            </button>
          </div>

          <span className='text-[11px] text-muted-foreground'>Auto-refreshed 20s ago</span>
        </div>
      </div>
    </div>
  );
}
