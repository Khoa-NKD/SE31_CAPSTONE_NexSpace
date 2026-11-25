import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import { Spinner as Loader2 } from '@/components/ui/spinner';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import {
  Plus,
  Search,
  Building2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspaceTable } from './workspace-table';
import { useDataTable } from '@/hooks/use-data-table';
import { WorkspaceCard } from './workspace-card';
import { WorkspaceFilterPills } from './workspace-filter-pills';
import { getWorkspaceColumns } from './workspace-columns';
import { useWorkspacesStore } from '../store/workspaces-store';
import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import { useWorkspacesQuery, useWorkspaceLifecycleMutation } from '@/features/workspaces/api';
import { mapCanonicalToOrganizerWorkspace } from '../utils/workspace-mapper';
import type { WorkspaceFilter, WorkspaceStatus } from '../types';

export function WorkspacesDashboardView() {
  const c = useOrganizerCopy();
  const navigate = useNavigate();
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

  const updateWorkspaceStatus = useWorkspacesStore((state) => state.updateWorkspaceStatus);

  // Authoritative server data precedence:
  // When the query succeeds (HTTP 200), always honor server records (even when empty).
  // Only fallback to local store if the API request resulted in a connection error.
  const workspaces = serverWorkspaces;
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
    const list = serverWorkspaces;
    return {
      all: totalElements,
      active: list.filter((w) => w.status === 'ACTIVE').length,
      pending: 0,
      inactive: list.filter((w) => w.status === 'INACTIVE').length,
      maintenance: list.filter((w) => w.status === 'MAINTENANCE').length,
      draft: list.filter((w) => w.status === 'DRAFT').length
    };
  }, [serverWorkspaces, totalElements]);

  // Filter workspaces based on search and status pill (client-side fallback if server didn't filter)
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((workspace) => {
      if (filter === 'active' && workspace.status !== 'ACTIVE') return false;
      if (filter === 'inactive' && workspace.status !== 'INACTIVE') return false;
      if (filter === 'holiday' && workspace.status !== 'HOLIDAY') return false;
      if (filter === 'maintenance' && workspace.status !== 'MAINTENANCE') return false;
      if (filter === 'draft' && workspace.status !== 'DRAFT') return false;
      if (filter === 'archived' && workspace.status !== 'ARCHIVED') return false;

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

  const lifecycleMutation = useWorkspaceLifecycleMutation();

  // Table columns definition with action handlers
  const handleStatusChange = useCallback(
    (id: string, newStatus: WorkspaceStatus) => {
      if (newStatus === 'MAINTENANCE') {
        void navigate({
          to: '/dashboard/organizer/blockout',
          search: { workspaceId: Number(id), scope: 'workspace' }
        });
        return;
      }
      const targetWs = workspaces.find((w) => w.id === id);
      const actionMap: Record<
        WorkspaceStatus,
        'ACTIVATE' | 'PENDING' | 'MAINTENANCE' | 'DRAFT' | 'ARCHIVE'
      > = {
        ACTIVE: 'ACTIVATE',
        HOLIDAY: 'ACTIVATE',
        INACTIVE: 'DRAFT',
        PENDING: 'DRAFT',
        MAINTENANCE: 'MAINTENANCE',
        DRAFT: 'DRAFT',
        ARCHIVED: 'ARCHIVE'
      };
      lifecycleMutation.mutate(
        {
          id,
          dto: {
            action: actionMap[newStatus],
            expectedVersion: targetWs?.version ?? 1
          },
          workspaceName: targetWs?.name
        },
        {
          onSuccess: () => {
            updateWorkspaceStatus(id, newStatus);
            refetch();
          }
        }
      );
    },
    [workspaces, lifecycleMutation, updateWorkspaceStatus, refetch, navigate]
  );

  const columns = useMemo(
    () => getWorkspaceColumns(c, handleStatusChange),
    [c, handleStatusChange]
  );

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
      columnPinning: {}
    }
  });

  return (
    <div className='mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-5 py-2 sm:py-4'>
      <OrganizerPageHeader
        title={c('My Workspaces', 'Không gian của tôi')}
        description={c(
          'Manage and configure your workspace venues.',
          'Quản lý và cấu hình các không gian làm việc của bạn.'
        )}
      >
        {isFetching && !isLoading && (
          <Loader2
            className='size-4 text-primary'
            aria-label={c('Refreshing workspaces', 'Đang làm mới danh sách không gian')}
          />
        )}
        {/* Action Controls */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Search Box */}
          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
            <Input
              type='search'
              placeholder={c(
                'Search workspace by name or address...',
                'Tìm không gian theo tên hoặc địa chỉ...'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9 text-xs sm:text-sm bg-card'
              aria-label={c(
                'Search workspace by name or address',
                'Tìm không gian theo tên hoặc địa chỉ'
              )}
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
              aria-label={c('List View', 'Dạng danh sách')}
            >
              <TableIcon className='size-3.5' />
              <span className='hidden sm:inline'>{c('List', 'Danh sách')}</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-8 px-2.5 gap-1.5 text-xs'
              onClick={() => setViewMode('grid')}
              aria-label={c('Grid View', 'Dạng lưới')}
            >
              <LayoutGrid className='size-3.5' />
              <span className='hidden sm:inline'>{c('Grid', 'Lưới')}</span>
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
              <span>{c('Create Workspace', 'Tạo không gian')}</span>
            </Link>
          </Button>
        </div>
      </OrganizerPageHeader>

      {/* Filter Segmented Controls */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <WorkspaceFilterPills filter={filter} onFilterChange={setFilter} counts={counts} />

        <div className='text-xs text-muted-foreground hidden sm:block'>
          {isLoading ? (
            <span>{c('Loading venues...', 'Đang tải không gian...')}</span>
          ) : isHardError ? (
            <span className='text-rose-500'>{c('Connection error', 'Lỗi kết nối')}</span>
          ) : (
            <>
              {c('Showing', 'Hiển thị')}{' '}
              <span className='font-semibold text-foreground'>{filteredWorkspaces.length}</span>{' '}
              {c('of', 'trên')}{' '}
              <span className='font-semibold text-foreground'>{totalElements}</span>{' '}
              {totalElements === 1 ? c('venue', 'không gian') : c('venues', 'không gian')}
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading &&
        (viewMode === 'table' ? (
          <LoadingPlaceholder className='flex flex-col gap-4'>
            <div className='h-12 bg-muted rounded-lg w-full' />
            <div className='h-72 bg-muted/60 rounded-lg w-full' />
            <div className='h-10 bg-muted rounded-lg w-full' />
          </LoadingPlaceholder>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <LoadingPlaceholder
                key={idx}
                className='flex flex-col rounded-xl bg-card border border-border shadow-2xs overflow-hidden'
              >
                <div className='w-full aspect-video bg-muted' />
                <div className='p-5 sm:p-6 flex flex-col gap-4'>
                  <div className='h-5 bg-muted rounded w-3/4' />
                  <div className='h-3 bg-muted rounded w-1/2' />
                  <div className='h-12 bg-muted/60 rounded-lg' />
                </div>
              </LoadingPlaceholder>
            ))}
          </div>
        ))}

      {/* Error State with Retry Button */}
      {isHardError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-8 sm:p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3'>
            <AlertCircle className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>
            {c('Failed to load workspaces', 'Không thể tải danh sách không gian')}
          </h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-md mt-1 mb-4'>
            {error instanceof Error
              ? error.message
              : c(
                  'Could not communicate with the backend API service.',
                  'Không thể kết nối đến máy chủ.'
                )}
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='gap-2 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive'
          >
            <RefreshCw className='size-3.5' />
            <span>{c('Retry Connection', 'Kết nối lại')}</span>
          </Button>
        </div>
      )}

      {/* Table View */}
      {!isLoading && !isHardError && viewMode === 'table' && <WorkspaceTable table={table} />}

      {/* Grid View */}
      {!isLoading && !isHardError && viewMode === 'grid' && filteredWorkspaces.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8'>
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Empty State for Grid View */}
      {!isLoading && !isHardError && viewMode === 'grid' && filteredWorkspaces.length === 0 && (
        <div className='rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center my-6 pb-8'>
          <div className='size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3'>
            <Building2 className='size-6' />
          </div>
          <h3 className='text-base font-semibold text-foreground'>
            {c('No workspaces found', 'Không tìm thấy không gian')}
          </h3>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-4'>
            {searchQuery
              ? c(
                  `No workspaces match "${searchQuery}". Try clearing your search.`,
                  `Không có không gian khớp với "${searchQuery}". Hãy thử xóa tìm kiếm.`
                )
              : c(
                  'You have not registered any workspace venues yet.',
                  'Bạn chưa đăng ký không gian làm việc nào.'
                )}
          </p>
          {searchQuery ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSearchQuery('')}
              className='text-xs'
            >
              {c('Clear Search', 'Xóa tìm kiếm')}
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
                <span>{c('Create Your First Workspace', 'Tạo không gian đầu tiên')}</span>
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
