import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import {
  Plus,
  Search,
  Building2,
  AlertCircle,
  RefreshCw,
  Loader2,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { WorkspaceCard } from './workspace-card';
import { WorkspaceFilterPills } from './workspace-filter-pills';
import { getWorkspaceColumns } from './workspace-columns';
import { useWorkspacesStore } from '../store/workspaces-store';
import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import { useWorkspacesQuery } from '@/features/workspaces/api';
import { mapCanonicalToOrganizerWorkspace } from '../utils/workspace-mapper';
import type { WorkspaceFilter, WorkspaceStatus } from '../types';

export function WorkspacesDashboardView() {
  const routerSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const page = (routerSearch.page as number) ?? 1;
  const perPage = (routerSearch.perPage as number) ?? 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<WorkspaceFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Authenticated query: token is sent automatically via apiClient Authorization Bearer header.
  // No organizerId is passed to conform to Caller ID Isolation security principles.
  const {
    data: workspaceListResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useWorkspacesQuery({
    page,
    limit: perPage,
    ...(filter !== 'all' ? { status: filter.toUpperCase() } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {})
  });

  // Map canonical API records to Organizer presentation models
  const serverWorkspaces = useMemo(() => {
    const rawList = workspaceListResponse?.content || workspaceListResponse?.listObjects;
    if (!rawList || !Array.isArray(rawList)) return [];
    return rawList.map(mapCanonicalToOrganizerWorkspace);
  }, [workspaceListResponse]);

  const storeWorkspaces = useWorkspacesStore((state) => state.workspaces);
  const updateWorkspaceStatus = useWorkspacesStore((state) => state.updateWorkspaceStatus);

  // Authoritative server data precedence:
  // When the query succeeds (HTTP 200), always honor server records (even when empty).
  // Only fallback to local store if the API request resulted in a connection error.
  const workspaces = isError ? storeWorkspaces : serverWorkspaces;
  const isHardError = isError && workspaces.length === 0;

  // Total records and pagination counts
  const totalElements = useMemo(() => {
    if (workspaceListResponse?.totalElements !== undefined) {
      return workspaceListResponse.totalElements;
    }
    if (workspaceListResponse?.totalRecords !== undefined) {
      return workspaceListResponse.totalRecords;
    }
    return workspaces.length;
  }, [workspaceListResponse, workspaces.length]);

  const pageCount = useMemo(() => {
    if (workspaceListResponse?.totalPages !== undefined && workspaceListResponse.totalPages > 0) {
      return workspaceListResponse.totalPages;
    }
    return Math.max(1, Math.ceil(totalElements / perPage));
  }, [workspaceListResponse, totalElements, perPage]);

  // Compute status summary counts strictly from serverWorkspaces when query is successful
  const counts = useMemo(() => {
    const list = isError ? storeWorkspaces : serverWorkspaces;
    return {
      all: totalElements,
      active: list.filter((w) => w.status === 'ACTIVE').length,
      draft: list.filter((w) => w.status === 'DRAFT').length,
      rejected: list.filter((w) => w.status === 'REJECTED').length
    };
  }, [isError, storeWorkspaces, serverWorkspaces, totalElements]);

  // Filter workspaces based on search and status pill (client-side fallback if server didn't filter)
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((workspace) => {
      if (filter === 'active' && workspace.status !== 'ACTIVE') return false;
      if (filter === 'draft' && workspace.status !== 'DRAFT') return false;
      if (filter === 'paused' && workspace.status !== 'PAUSED') return false;
      if (filter === 'maintenance' && workspace.status !== 'MAINTENANCE') return false;
      if (filter === 'archived' && workspace.status !== 'ARCHIVED') return false;
      if (filter === 'rejected' && workspace.status !== 'REJECTED') return false;

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

  // Table columns definition with action handlers
  const handleStatusChange = useCallback(
    (id: string, newStatus: WorkspaceStatus) => {
      updateWorkspaceStatus(id, newStatus);
      refetch();
    },
    [updateWorkspaceStatus, refetch]
  );

  const columns = useMemo(() => getWorkspaceColumns(handleStatusChange), [handleStatusChange]);

  const { table } = useDataTable({
    data: filteredWorkspaces,
    columns,
    pageCount,
    shallow: true,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize: perPage
      },
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <div className='w-full max-w-[1360px] mx-auto py-2 sm:py-4 flex flex-col gap-6'>
      {/* Top Controls Header Bar */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
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
              disabled={isLoading || isHardError}
            />
          </div>

          {/* View Mode Toggle */}
          <div className='flex items-center border rounded-lg bg-card p-0.5 shadow-2xs'>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-8 px-2.5 gap-1.5 text-xs'
              onClick={() => setViewMode('table')}
              aria-label='Table View'
            >
              <TableIcon className='size-3.5' />
              <span className='hidden sm:inline'>Table</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-8 px-2.5 gap-1.5 text-xs'
              onClick={() => setViewMode('grid')}
              aria-label='Grid View'
            >
              <LayoutGrid className='size-3.5' />
              <span className='hidden sm:inline'>Grid</span>
            </Button>
          </div>

          {/* Primary Create Button */}
          <Button
            asChild
            className='h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2 shadow-2xs'
            onClick={() => useWizardStore.getState().resetDraft()}
          >
            <Link to='/dashboard/organizer/workspaces/create'>
              <Plus className='size-4' />
              <span>Create Workspace</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Segmented Controls */}
      <div className='flex items-center justify-between'>
        <WorkspaceFilterPills
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />

        <div className='text-xs text-muted-foreground hidden sm:block'>
          {isLoading ? (
            <span>Loading venues...</span>
          ) : isHardError ? (
            <span className='text-rose-500'>Connection error</span>
          ) : (
            <>
              Showing <span className='font-semibold text-foreground'>{filteredWorkspaces.length}</span> of{' '}
              <span className='font-semibold text-foreground'>{totalElements}</span>{' '}
              {totalElements === 1 ? 'venue' : 'venues'}
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        viewMode === 'table' ? (
          <div className='flex flex-col gap-4 animate-pulse'>
            <div className='h-12 bg-muted rounded-lg w-full' />
            <div className='h-72 bg-muted/60 rounded-lg w-full' />
            <div className='h-10 bg-muted rounded-lg w-full' />
          </div>
        ) : (
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
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Error State with Retry Button */}
      {isHardError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-8 sm:p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3'>
            <AlertCircle className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>Failed to load workspaces</h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-md mt-1 mb-4'>
            {error instanceof Error
              ? error.message
              : 'Could not communicate with the backend API service.'}
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

      {/* Table View */}
      {!isLoading && !isHardError && viewMode === 'table' && (
        <div className='min-h-[360px] flex flex-col flex-1'>
          <DataTable table={table} />
        </div>
      )}

      {/* Grid View */}
      {!isLoading && !isHardError && viewMode === 'grid' && filteredWorkspaces.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      {/* Empty State for Grid View */}
      {!isLoading && !isHardError && viewMode === 'grid' && filteredWorkspaces.length === 0 && (
        <div className='rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3'>
            <Building2 className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>No workspaces found</h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-4'>
            {searchQuery
              ? `No workspaces match "${searchQuery}". Try clearing your search.`
              : 'You have not registered any workspace venues yet.'}
          </p>
          {searchQuery ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSearchQuery('')}
              className='text-xs'
            >
              Clear Search
            </Button>
          ) : (
            <Button
              asChild
              size='sm'
              className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2 shadow-2xs'
              onClick={() => useWizardStore.getState().resetDraft()}
            >
              <Link to='/dashboard/organizer/workspaces/create'>
                <Plus className='size-4' />
                <span>Create Your First Workspace</span>
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
