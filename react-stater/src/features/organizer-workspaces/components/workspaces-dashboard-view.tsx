import React, { useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Search, Building2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspaceCard } from './workspace-card';
import { WorkspaceFilterPills } from './workspace-filter-pills';
import { useWorkspacesStore } from '../store/workspaces-store';
import { useWorkspacesQuery } from '@/features/workspaces/api';
import { mapCanonicalToOrganizerWorkspace } from '../utils/workspace-mapper';
import type { WorkspaceFilter } from '../types';

// Mock organizer identity: Sarah Jenkins / LoftSpaces Hospitality Group
const CURRENT_ORGANIZER_ID = 'USR-9432';

export function WorkspacesDashboardView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<WorkspaceFilter>('all');

  // Centralized Mock REST API Query
  const {
    data: workspaceListResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useWorkspacesQuery({ organizerId: CURRENT_ORGANIZER_ID, limit: 50 });

  // Map canonical API records to Organizer presentation models
  const serverWorkspaces = useMemo(() => {
    if (!workspaceListResponse?.content) return [];
    return workspaceListResponse.content.map(mapCanonicalToOrganizerWorkspace);
  }, [workspaceListResponse]);

  // Non-destructively synchronize server data with Zustand/localStorage store
  useEffect(() => {
    if (serverWorkspaces.length > 0) {
      useWorkspacesStore.getState().syncWorkspaces(serverWorkspaces);
    }
  }, [serverWorkspaces]);

  const workspaces = serverWorkspaces;

  // Compute counts based on live server records
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
      if (filter === 'paused' && workspace.status !== 'PAUSED') return false;
      if (filter === 'maintenance' && workspace.status !== 'MAINTENANCE') return false;
      if (filter === 'archived' && workspace.status !== 'ARCHIVED') return false;

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
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight'>
              My Workspaces
            </h1>
            {isFetching && !isLoading && (
              <Loader2 className='size-4 text-indigo-500 animate-spin' aria-label='Refreshing workspaces' />
            )}
          </div>
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
              disabled={isLoading || isError}
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
          {isLoading ? (
            <span>Loading venues...</span>
          ) : isError ? (
            <span className='text-rose-500'>Connection error</span>
          ) : (
            <>
              Showing <span className='font-semibold text-foreground'>{filteredWorkspaces.length}</span>{' '}
              {filteredWorkspaces.length === 1 ? 'venue' : 'venues'}
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton Grid */}
      {isLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className='flex flex-col rounded-xl bg-card border border-border shadow-2xs overflow-hidden animate-pulse'
            >
              <div className='w-full aspect-video bg-muted' />
              <div className='p-5 sm:p-6 flex flex-col gap-4'>
                <div className='h-5 bg-muted rounded w-3/4' />
                <div className='h-3 bg-muted rounded w-1/2' />
                <div className='h-12 bg-muted/60 rounded-lg' />
                <div className='h-2 bg-muted rounded w-full' />
                <div className='h-9 bg-muted rounded w-full' />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State with Retry Button */}
      {isError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-8 sm:p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3'>
            <AlertCircle className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>Failed to load workspaces</h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-md mt-1 mb-4'>
            {error instanceof Error
              ? error.message
              : 'Could not communicate with the centralized Mock REST API server at http://localhost:4000.'}
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='gap-2 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive'
          >
            <RefreshCw className='size-3.5' />
            <span>Retry Connection</span>
          </Button>
        </div>
      )}

      {/* Workspace Cards Grid */}
      {!isLoading && !isError && filteredWorkspaces.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredWorkspaces.length === 0 && (
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
