import React from 'react';
import {
  Search,
  Calendar,
  Filter,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BookingStatus, BookingResourceType } from '../types';

export interface BookingsFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | BookingStatus;
  onStatusFilterChange: (status: 'ALL' | BookingStatus) => void;
  resourceCategoryFilter: 'ALL' | BookingResourceType;
  onResourceCategoryChange: (cat: 'ALL' | BookingResourceType) => void;
  dateRangeLabel: string;
  onDateRangeChange: (label: string) => void;
  totalCount: number;
  confirmedCount: number;
  pendingCount: number;
  cancelledCount: number;
  onResetFilters?: () => void;
}

const DATE_RANGE_OPTIONS = [
  'Today',
  'This Week (Jan 20 - Jan 27, 2026)',
  'This Month (Jan 2026)',
  'Last 30 Days'
];

export function BookingsFilterBar({
  searchQuery = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  resourceCategoryFilter = 'ALL',
  onResourceCategoryChange,
  dateRangeLabel = 'This Week (Jan 20 - Jan 27, 2026)',
  onDateRangeChange,
  totalCount = 0,
  confirmedCount = 0,
  pendingCount = 0,
  cancelledCount = 0,
  onResetFilters
}: BookingsFilterBarProps) {
  const isFiltered = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    (resourceCategoryFilter && resourceCategoryFilter !== 'ALL')
  );

  const statusTabs: { key: 'ALL' | BookingStatus; label: string; count: number; activeClass: string }[] = [
    {
      key: 'ALL',
      label: 'All',
      count: totalCount,
      activeClass: 'bg-primary text-primary-foreground shadow-2xs'
    },
    {
      key: 'CONFIRMED',
      label: 'Confirmed',
      count: confirmedCount,
      activeClass:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
    },
    {
      key: 'PENDING_PAYMENT',
      label: 'Pending Payment',
      count: pendingCount,
      activeClass:
        'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
    },
    {
      key: 'CANCELLED',
      label: 'Cancelled',
      count: cancelledCount,
      activeClass: 'bg-muted text-foreground border border-border'
    }
  ];

  return (
    <section className="bg-card rounded-xl border border-border p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left Side Controls: Search, Date Range, Resource Type */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input box */}
        <div className="relative w-full sm:w-[320px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Booking ID, Customer, Resource..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Date Range Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-2 border-border bg-background shadow-2xs font-normal"
            >
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{dateRangeLabel || 'All Dates'}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => onDateRangeChange(opt)}
                className={`text-xs cursor-pointer ${
                  opt === dateRangeLabel ? 'font-semibold bg-accent text-accent-foreground' : ''
                }`}
              >
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Resource Type Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-2 border-border bg-background shadow-2xs font-normal"
            >
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {resourceCategoryFilter === 'ALL' || !resourceCategoryFilter
                  ? 'All Resources (Hot Desks, Pods, Rooms)'
                  : String(resourceCategoryFilter).replace('_', ' ')}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => onResourceCategoryChange('ALL')}
              className="text-xs cursor-pointer"
            >
              All Resources
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResourceCategoryChange('HOT_DESK')}
              className="text-xs cursor-pointer"
            >
              Hot Desks
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResourceCategoryChange('DEDICATED_DESK')}
              className="text-xs cursor-pointer"
            >
              Dedicated Desks
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResourceCategoryChange('MEETING_ROOM')}
              className="text-xs cursor-pointer"
            >
              Meeting Rooms / Suites
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResourceCategoryChange('BOOTH')}
              className="text-xs cursor-pointer"
            >
              Phone Booths
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Side: Status Filter Pills + Clear Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Booking Status Filters"
          className="flex flex-wrap items-center gap-1.5"
        >
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onStatusFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? tab.activeClass
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {isFiltered && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </section>
  );
}
