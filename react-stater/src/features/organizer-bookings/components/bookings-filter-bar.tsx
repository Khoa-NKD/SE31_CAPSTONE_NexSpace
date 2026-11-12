import {
  Search,
  Calendar,
  Filter,
  ChevronDown,
  RotateCcw,
  Building2
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

export interface WorkspaceOption {
  id: number | string;
  name: string;
}

export interface BookingsFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | BookingStatus;
  onStatusFilterChange: (status: 'ALL' | BookingStatus) => void;
  resourceCategoryFilter: 'ALL' | BookingResourceType;
  onResourceCategoryChange: (cat: 'ALL' | BookingResourceType) => void;
  dateRangeLabel: string;
  onDateRangeChange: (label: string) => void;
  customDate?: string;
  onCustomDateChange?: (date: string) => void;
  workspaces?: WorkspaceOption[];
  selectedWorkspaceId?: number | string | 'ALL';
  onWorkspaceChange?: (workspaceId: number | string | 'ALL') => void;
  totalCount: number;
  confirmedCount: number;
  pendingApprovalCount?: number;
  pendingCount: number;
  completedCount?: number;
  cancelledCount: number;
  onResetFilters?: () => void;
}

const DATE_RANGE_OPTIONS = [
  'All Dates',
  'Today',
  'Tomorrow',
  'This Week',
  'This Month',
  'Custom Date'
];

export function BookingsFilterBar({
  searchQuery = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  resourceCategoryFilter = 'ALL',
  onResourceCategoryChange,
  dateRangeLabel = 'All Dates',
  onDateRangeChange,
  customDate,
  onCustomDateChange,
  workspaces = [],
  selectedWorkspaceId = 'ALL',
  onWorkspaceChange,
  totalCount = 0,
  confirmedCount = 0,
  pendingApprovalCount = 0,
  pendingCount = 0,
  completedCount = 0,
  cancelledCount = 0,
  onResetFilters
}: BookingsFilterBarProps) {
  const isFiltered = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    (resourceCategoryFilter && resourceCategoryFilter !== 'ALL') ||
    (selectedWorkspaceId && selectedWorkspaceId !== 'ALL') ||
    (dateRangeLabel && dateRangeLabel !== 'All Dates') ||
    customDate
  );

  const statusTabs: { key: 'ALL' | BookingStatus; label: string; count: number; activeClass: string }[] = [
    {
      key: 'ALL',
      label: 'All',
      count: totalCount,
      activeClass: 'bg-primary text-primary-foreground shadow-2xs'
    },
    {
      key: 'PENDING_APPROVAL',
      label: 'Needs Approval',
      count: pendingApprovalCount,
      activeClass:
        'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30'
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
      label: 'Pending',
      count: pendingCount,
      activeClass:
        'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      count: completedCount,
      activeClass:
        'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
    },
    {
      key: 'CANCELLED',
      label: 'Cancelled',
      count: cancelledCount,
      activeClass: 'bg-muted text-foreground border border-border'
    }
  ];

  const selectedWorkspaceName =
    selectedWorkspaceId === 'ALL' || !selectedWorkspaceId
      ? 'All Workspaces'
      : workspaces.find((w) => String(w.id) === String(selectedWorkspaceId))?.name || 'Workspace';

  return (
    <section className="bg-card rounded-xl border border-border p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left Side Controls: Workspace, Search, Date Range, Resource Type */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Workspace Dropdown */}
        {workspaces.length > 0 && onWorkspaceChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs gap-2 border-border bg-background shadow-2xs font-normal"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="max-w-[150px] truncate">{selectedWorkspaceName}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem
                onClick={() => onWorkspaceChange('ALL')}
                className={`text-xs cursor-pointer ${
                  selectedWorkspaceId === 'ALL' || !selectedWorkspaceId ? 'font-semibold bg-accent text-accent-foreground' : ''
                }`}
              >
                Tất cả không gian (All Workspaces)
              </DropdownMenuItem>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => onWorkspaceChange(ws.id)}
                  className={`text-xs cursor-pointer truncate ${
                    String(selectedWorkspaceId) === String(ws.id) ? 'font-semibold bg-accent text-accent-foreground' : ''
                  }`}
                >
                  {ws.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Search input box */}
        <div className="relative w-full sm:w-[240px] md:w-[280px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search code, customer, resource..."
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
          <DropdownMenuContent align="start" className="w-52">
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

        {/* Custom Date Input (shown when Custom Date is selected) */}
        {dateRangeLabel === 'Custom Date' && onCustomDateChange && (
          <Input
            type="date"
            value={customDate || ''}
            onChange={(e) => onCustomDateChange(e.target.value)}
            className="h-9 w-auto text-xs bg-background"
          />
        )}

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
                  ? 'All Resources'
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
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </section>
  );
}
