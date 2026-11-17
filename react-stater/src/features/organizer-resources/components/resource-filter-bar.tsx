import React from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronDown,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ResourceTypeFilter,
  ResourceZoneFilter,
  ResourceStatusFilter
} from '../types';

interface ResourceFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: ResourceTypeFilter;
  onTypeFilterChange: (type: ResourceTypeFilter) => void;
  zoneFilter: ResourceZoneFilter;
  onZoneFilterChange: (zone: ResourceZoneFilter) => void;
  statusFilter: ResourceStatusFilter;
  onStatusFilterChange: (status: ResourceStatusFilter) => void;
  counts: {
    all: number;
    hotDesk: number;
    dedicatedDesk: number;
    meetingRoom: number;
  };
  selectedCount: number;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkExport: () => void;
  onOpenAddResource: () => void;
}

export function ResourceFilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  zoneFilter,
  onZoneFilterChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  selectedCount,
  onBulkEnable,
  onBulkDisable,
  onBulkExport,
  onOpenAddResource
}: ResourceFilterBarProps) {
  return (
    <section aria-label='Filter and Search Controls' className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2'>
      {/* Left Filter Cluster */}
      <div className='flex flex-wrap items-center gap-3'>
        {/* Search Input Field */}
        <div className='relative w-full sm:w-80'>
          <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
          <Input
            type='search'
            placeholder='Search code, desk label, hardware ID...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-10 pr-9 h-10 text-xs sm:text-sm bg-card border-border shadow-2xs focus-visible:ring-primary'
            aria-label='Search resources'
          />
          {searchQuery && (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5'
              aria-label='Clear search'
            >
              <X className='size-3.5' />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div
          role='group'
          aria-label='Resource type filter'
          className='flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border overflow-x-auto max-w-full'
        >
          {/* All */}
          <button
            type='button'
            onClick={() => onTypeFilterChange('all')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-all shadow-2xs whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({counts.all})
          </button>

          {/* Hot Desk */}
          <button
            type='button'
            onClick={() => onTypeFilterChange('HOT_DESK')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              typeFilter === 'HOT_DESK'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hot Desk ({counts.hotDesk})
          </button>

          {/* Dedicated Desk */}
          <button
            type='button'
            onClick={() => onTypeFilterChange('DEDICATED_DESK')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              typeFilter === 'DEDICATED_DESK'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dedicated Desk ({counts.dedicatedDesk})
          </button>

          {/* Meeting Room */}
          <button
            type='button'
            onClick={() => onTypeFilterChange('MEETING_ROOM')}
            className={`h-8 px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              typeFilter === 'MEETING_ROOM'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Meeting Room ({counts.meetingRoom})
          </button>
        </div>

        {/* Zone Dropdown */}
        <div className='w-48'>
          <Select value={zoneFilter} onValueChange={(val) => onZoneFilterChange(val as ResourceZoneFilter)}>
            <SelectTrigger className='h-10 text-xs bg-card border-border shadow-2xs'>
              <SelectValue placeholder='Select Zone' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>All Zones (Zone A, B, C)</SelectItem>
              <SelectItem value='ZONE_A' className='text-xs'>Zone A — Quiet Focus</SelectItem>
              <SelectItem value='ZONE_B' className='text-xs'>Zone B — Collaborative Hub</SelectItem>
              <SelectItem value='ZONE_C' className='text-xs'>Zone C — Executive Suites</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Dropdown */}
        <div className='w-48'>
          <Select value={statusFilter} onValueChange={(val) => onStatusFilterChange(val as ResourceStatusFilter)}>
            <SelectTrigger className='h-10 text-xs bg-card border-border shadow-2xs'>
              <SelectValue placeholder='Select Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>All Statuses (Bookable / Disabled)</SelectItem>
              <SelectItem value='BOOKABLE' className='text-xs'>Bookable (Active)</SelectItem>
              <SelectItem value='DISABLED' className='text-xs'>Disabled (Maintenance)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right Action Cluster */}
      <div className='flex items-center gap-3 self-end lg:self-auto shrink-0'>
        {/* Bulk Actions Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='h-10 px-4 text-xs font-semibold gap-2 shadow-2xs'
              disabled={selectedCount === 0}
            >
              <SlidersHorizontal className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Bulk Actions {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
              <ChevronDown className='size-3.5 text-muted-foreground' aria-hidden='true' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuLabel className='text-xs text-muted-foreground font-normal'>
              Selected: {selectedCount} items
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBulkEnable} className='text-xs gap-2 py-2 cursor-pointer'>
              <ToggleRight className='size-4 text-emerald-600' />
              <span>Enable Bookable Status</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBulkDisable} className='text-xs gap-2 py-2 cursor-pointer'>
              <ToggleLeft className='size-4 text-amber-600' />
              <span>Set to Maintenance</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBulkExport} className='text-xs gap-2 py-2 cursor-pointer'>
              <FileSpreadsheet className='size-4 text-primary' />
              <span>Export Selected CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary CTA */}
        <Button
          type='button'
          onClick={onOpenAddResource}
          className='h-10 px-5 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-150 active:scale-95'
        >
          <Plus className='size-4 stroke-[2.5]' aria-hidden='true' />
          <span>Add New Resource</span>
        </Button>
      </div>
    </section>
  );
}

