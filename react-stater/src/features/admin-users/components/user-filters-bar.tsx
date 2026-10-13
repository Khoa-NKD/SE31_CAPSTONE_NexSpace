import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, FilterX, X } from 'lucide-react';

interface UserFiltersBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedRole: string;
  onRoleChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedKyc: string;
  onKycChange: (val: string) => void;
  onResetAll: () => void;
}

export function UserFiltersBar({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  selectedKyc,
  onKycChange,
  onResetAll
}: UserFiltersBarProps) {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRole !== 'all' ||
    selectedStatus !== 'all' ||
    selectedKyc !== 'all';

  return (
    <Card className='rounded-xl border border-border/80 p-4 mb-6 shadow-xs bg-card'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center'>
        {/* Search input (4 cols on lg) */}
        <div className='lg:col-span-4 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Search by name, email, or user ID (e.g. USR-8821)...'
            className='h-9 pl-9 pr-3 text-xs bg-card'
          />
        </div>

        {/* Role Dropdown (2 cols) */}
        <div className='lg:col-span-2 relative'>
          <label htmlFor='user-role-filter' className='sr-only'>
            Filter users by role
          </label>
          <select
            id='user-role-filter'
            aria-label='Filter users by role'
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className='w-full h-9 pl-3 pr-8 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
          >
            <option value='all'>All Roles (18,420)</option>
            <option value='Customer'>Customer</option>
            <option value='Organizer'>Organizer</option>
            <option value='Administrator'>Administrator</option>
          </select>
        </div>

        {/* Account Status Dropdown (2 cols) */}
        <div className='lg:col-span-2 relative'>
          <label htmlFor='user-status-filter' className='sr-only'>
            Filter users by account status
          </label>
          <select
            id='user-status-filter'
            aria-label='Filter users by account status'
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className='w-full h-9 pl-3 pr-8 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
          >
            <option value='all'>All Statuses</option>
            <option value='Active'>Active</option>
            <option value='Locked'>Locked</option>
            <option value='Inactive'>Inactive</option>
          </select>
        </div>

        {/* KYC Verification Dropdown (2 cols) */}
        <div className='lg:col-span-2 relative'>
          <label htmlFor='user-kyc-filter' className='sr-only'>
            Filter users by KYC verification status
          </label>
          <select
            id='user-kyc-filter'
            aria-label='Filter users by KYC verification status'
            value={selectedKyc}
            onChange={(e) => onKycChange(e.target.value)}
            className='w-full h-9 pl-3 pr-8 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
          >
            <option value='all'>All KYC Status</option>
            <option value='Verified KYC'>Verified KYC</option>
            <option value='Pending KYC'>Pending KYC</option>
            <option value='Unverified'>Unverified</option>
          </select>
        </div>

        {/* Date Range & Reset Preset (2 cols) */}
        <div className='lg:col-span-2 flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-9 flex-1 flex items-center justify-between text-xs px-2.5 font-normal'
          >
            <span className='truncate'>Last 30 Days</span>
            <Calendar className='size-3.5 text-muted-foreground' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            onClick={onResetAll}
            title='Clear Filters'
            disabled={!hasActiveFilters}
            className='h-9 w-9 shrink-0'
          >
            <FilterX className='size-4' />
          </Button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className='flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground'>
          <span className='font-medium text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider'>
            Active Filters:
          </span>

          {searchQuery.trim() !== '' && (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border text-[11px] font-medium'>
              <span>Query: "{searchQuery}"</span>
              <button
                type='button'
                onClick={() => onSearchChange('')}
                className='hover:text-destructive'
              >
                <X className='size-3' />
              </button>
            </span>
          )}

          {selectedRole !== 'all' && (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border text-[11px] font-medium'>
              <span>Role: {selectedRole}</span>
              <button
                type='button'
                onClick={() => onRoleChange('all')}
                className='hover:text-destructive'
              >
                <X className='size-3' />
              </button>
            </span>
          )}

          {selectedStatus !== 'all' && (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border text-[11px] font-medium'>
              <span>Status: {selectedStatus}</span>
              <button
                type='button'
                onClick={() => onStatusChange('all')}
                className='hover:text-destructive'
              >
                <X className='size-3' />
              </button>
            </span>
          )}

          {selectedKyc !== 'all' && (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border text-[11px] font-medium'>
              <span>KYC: {selectedKyc}</span>
              <button
                type='button'
                onClick={() => onKycChange('all')}
                className='hover:text-destructive'
              >
                <X className='size-3' />
              </button>
            </span>
          )}

          <button
            type='button'
            onClick={onResetAll}
            className='text-primary text-xs font-semibold hover:underline ml-1'
          >
            Reset all
          </button>
        </div>
      )}
    </Card>
  );
}
