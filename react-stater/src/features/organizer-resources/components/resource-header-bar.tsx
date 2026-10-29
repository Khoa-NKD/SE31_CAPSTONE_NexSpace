import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  ChevronRight,
  Upload,
  Layers,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface ResourceHeaderBarProps {
  currentFloor: string;
  onFloorChange: (floor: string) => void;
  onOpenBulkImport: () => void;
  totalCount: number;
  activeCount: number;
  occupancyPercent: number;
}

const FLOORS = [
  { id: 'floor-12', label: 'Floor 12 — Main Coworking Floor', units: 47 },
  { id: 'floor-14', label: 'Floor 14 — Executive Suites & Studios', units: 28 },
  { id: 'floor-15', label: 'Floor 15 — Rooftop Event Space & Pods', units: 14 }
];

export function ResourceHeaderBar({
  currentFloor,
  onFloorChange,
  onOpenBulkImport,
  totalCount,
  activeCount,
  occupancyPercent
}: ResourceHeaderBarProps) {
  return (
    <div className='flex flex-col gap-4'>
      {/* 1. Breadcrumbs */}
      <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto py-1'>
        <Link
          to='/dashboard/organizer/workspaces'
          className='hover:text-foreground transition-colors flex items-center gap-1.5'
        >
          <Building2 className='size-3.5' aria-hidden='true' />
          <span>Workspaces</span>
        </Link>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <span className='hover:text-foreground transition-colors cursor-pointer'>District 1, HCMC</span>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <Link
          to='/dashboard/organizer/workspaces'
          className='hover:text-foreground transition-colors'
        >
          NexSpace Saigon Prime Hub
        </Link>
        <ChevronRight className='size-3 text-muted-foreground/60' aria-hidden='true' />
        <span className='text-foreground font-semibold'>Resource Table</span>
      </nav>

      {/* 2. Top Title & Quick Actions Row */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div className='flex flex-col gap-1.5'>
          <div className='flex flex-wrap items-center gap-3'>
            <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Resource Inventory &amp; Table Management
            </h1>

            {/* Floor Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  className='inline-flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-muted/70 border border-border rounded-lg shadow-2xs text-xs font-medium text-foreground transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                  aria-label='Select floor'
                >
                  <span className='size-2 rounded-full bg-emerald-500 animate-pulse' aria-hidden='true' />
                  <span className='font-semibold'>{currentFloor}</span>
                  <ChevronDown className='size-3.5 text-muted-foreground' aria-hidden='true' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-64'>
                <DropdownMenuLabel className='text-xs text-muted-foreground font-normal'>
                  Available Venue Floors
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FLOORS.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => onFloorChange(f.label)}
                    className='flex items-center justify-between text-xs py-2 cursor-pointer'
                  >
                    <div className='flex items-center gap-2'>
                      <Layers className='size-3.5 text-muted-foreground' />
                      <span className={currentFloor === f.label ? 'font-semibold text-primary' : ''}>
                        {f.label}
                      </span>
                    </div>
                    {currentFloor === f.label && <Check className='size-4 text-primary' />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className='text-xs sm:text-sm text-muted-foreground max-w-2xl'>
            Granular control over all bookable desks, pods, private cabins, and conference rooms across Floor 12.
          </p>
        </div>

        {/* Right side stats & Bulk Import */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Live Operational Stats Pills */}
          <div className='hidden xl:flex items-center gap-2 border-r border-border pr-3.5 text-xs'>
            <div className='px-2.5 py-1 rounded-md bg-muted/70 text-foreground border border-border flex items-center gap-1.5'>
              <span className='size-1.5 rounded-full bg-muted-foreground' aria-hidden='true' />
              <span>Total: <strong className='font-semibold'>{totalCount} Units</strong></span>
            </div>
            <div className='px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5'>
              <span className='size-1.5 rounded-full bg-emerald-500' aria-hidden='true' />
              <span>Active: <strong className='font-semibold'>{activeCount} Units</strong></span>
            </div>
            <div className='px-2.5 py-1 rounded-md bg-primary/10 text-primary dark:text-primary-foreground border border-primary/20 flex items-center gap-1.5'>
              <span className='size-1.5 rounded-full bg-primary' aria-hidden='true' />
              <span>Occupancy: <strong className='font-semibold'>{occupancyPercent}%</strong></span>
            </div>
          </div>

          {/* Quick Bulk Import */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onOpenBulkImport}
            className='h-9 gap-2 shadow-2xs text-xs font-semibold'
          >
            <Upload className='size-4 text-muted-foreground' aria-hidden='true' />
            <span>Quick Bulk Import</span>
          </Button>

          {/* Create Resource CTA */}
          <Button
            asChild
            size='sm'
            className='h-9 gap-1.5 shadow-sm text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90'
          >
            <Link to='/dashboard/organizer/resources/create'>
              <Plus className='size-4' aria-hidden='true' />
              <span>Create Resource</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

