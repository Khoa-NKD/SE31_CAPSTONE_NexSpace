import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspaceCard } from './workspace-card';
import { WorkspaceFilterPills } from './workspace-filter-pills';
import { useWorkspacesStore } from '../store/workspaces-store';
import type { WorkspaceFilter } from '../types';

export function WorkspacesDashboardView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<WorkspaceFilter>('all');
  const workspaces = useWorkspacesStore((state) => state.workspaces);

  // Compute counts
  const counts = useMemo(
    () => ({
      all: workspaces.length,
      active: workspaces.filter((w) => w.status === 'ACTIVE').length,
      draft: workspaces.filter((w) => w.status === 'DRAFT').length
    }),
    [workspaces]
  );

  // Filter workspaces based on search and status pill
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((workspace) => {
      // Filter status
      if (filter === 'active' && workspace.status !== 'ACTIVE') return false;
      if (filter === 'draft' && workspace.status !== 'DRAFT') return false;

      // Filter search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = workspace.name.toLowerCase().includes(query);
        const matchesAddress = workspace.address.toLowerCase().includes(query);
        const matchesDistrict = workspace.district.toLowerCase().includes(query);
        return matchesName || matchesAddress || matchesDistrict;
      }

      return true;
    });
  }, [workspaces, filter, searchQuery]);

  return (
    <div className='w-full max-w-[1360px] mx-auto py-2 sm:py-4'>
      {/* Top Controls Header Bar */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
            My Workspaces
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            Manage, monitor occupancy, and configure your flexible workspace venues.
          </p>
        </div>

        {/* Action Controls */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Search Box */}
          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
            <Input
              type='search'
              placeholder='Search workspace by name or address...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9 text-xs sm:text-sm bg-card'
              aria-label='Search workspace by name or address'
            />
          </div>

          {/* Primary Create Button */}
          <Button
            asChild
            className='h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2 shadow-2xs'
          >
            <Link to='/dashboard/organizer/workspaces/create'>
              <Plus className='size-4' />
              <span>Create Workspace</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Segmented Controls */}
      <div className='flex items-center justify-between mb-6'>
        <WorkspaceFilterPills
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />

        <div className='text-xs text-muted-foreground hidden sm:block'>
          Showing <span className='font-semibold text-foreground'>{filteredWorkspaces.length}</span>{' '}
          {filteredWorkspaces.length === 1 ? 'venue' : 'venues'}
        </div>
      </div>

      {/* Workspace Cards Grid */}
      {filteredWorkspaces.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className='rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3'>
            <Building2 className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>No workspaces found</h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-4'>
            {searchQuery
              ? `No workspaces match "${searchQuery}". Try clearing your search.`
              : 'No workspaces currently in this filter state.'}
          </p>
          {searchQuery && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSearchQuery('')}
              className='text-xs'
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
