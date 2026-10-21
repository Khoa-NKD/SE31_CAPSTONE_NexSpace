import React, { useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  WorkspaceDirectoryItem,
  WorkspaceStatus,
  mapCanonicalToDirectoryItem
} from '@/features/admin-workspaces/data/mock-workspaces-directory';
import { WorkspaceDirectoryFilters } from '@/features/admin-workspaces/components/workspace-directory-filters';
import { WorkspaceDirectoryTable } from '@/features/admin-workspaces/components/workspace-directory-table';
import { WorkspaceDetailsDrawer } from '@/features/admin-workspaces/components/workspace-details-drawer';
import {
  useWorkspacesQuery,
  useAdminReviewWorkspaceMutation,
  useAdminModerateWorkspaceMutation
} from '@/features/workspaces/api';

const directorySearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'active', 'suspended']).optional().default('all'),
  city: z.string().optional().default('all'),
  hubId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/workspaces/directory')({
  head: () => ({
    meta: [
      { title: 'A07 — Workspace Directory & Moderation | NexSpace Console' },
      {
        name: 'description',
        content: 'Consolidated inventory and compliance management across all platform flexible office hubs.'
      }
    ]
  }),
  validateSearch: zodValidator(directorySearchSchema),
  component: WorkspaceDirectoryPage
});

function handleExportDirectory(count: number) {
  toast.success('Workspace Directory Exported (CSV)', {
    description: `Exported directory records for ${count} workspaces.`
  });
}

function WorkspaceDirectoryPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  // 1. Fetch real canonical workspaces from centralized Workspace REST API
  const {
    data: workspacesResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useWorkspacesQuery({
    role: 'Administrator',
    limit: 100
  });

  // 2. Administrator Review and Moderation mutations
  const reviewMutation = useAdminReviewWorkspaceMutation();
  const moderateMutation = useAdminModerateWorkspaceMutation();

  const isSubmitting = reviewMutation.isPending || moderateMutation.isPending;

  // 3. Map canonical workspaces to directory items
  const content = workspacesResponse?.content;
  const workspaces: WorkspaceDirectoryItem[] = useMemo(() => {
    if (!content) return [];
    return content.map(mapCanonicalToDirectoryItem);
  }, [content]);

  // 4. Calculate dynamic summary KPIs from persisted data
  const directoryKpis = useMemo(() => {
    const totalCount = workspaces.length;
    const pendingReviewCount = workspaces.filter((w) => w.reviewStatus === 'Pending').length;
    const activeCount = workspaces.filter(
      (w) => w.reviewStatus === 'Approved' && w.moderationStatus === 'Normal'
    ).length;
    const suspendedCount = workspaces.filter((w) => w.moderationStatus === 'Suspended').length;
    return {
      totalCount,
      pendingReviewCount,
      activeCount,
      suspendedCount
    };
  }, [workspaces]);

  // 5. Drawer selection synced with query param
  const selectedWorkspace = useMemo(() => {
    if (!searchParams.hubId) return null;
    return workspaces.find((w) => w.id === searchParams.hubId) || null;
  }, [searchParams.hubId, workspaces]);

  const isDrawerOpen = Boolean(searchParams.hubId);

  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as WorkspaceStatus | 'all') || 'all';
  const selectedCity = searchParams.city || 'all';

  // Filtered items
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((w) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = w.name.toLowerCase().includes(query);
        const matchesHubId = w.id.toLowerCase().includes(query);
        const matchesOrg = w.organizerLegalName.toLowerCase().includes(query);
        const matchesZone = w.metroZone.toLowerCase().includes(query);
        if (!matchesName && !matchesHubId && !matchesOrg && !matchesZone) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && w.status !== statusFilter) {
        return false;
      }

      // City filter
      if (selectedCity !== 'all' && w.city !== selectedCity) {
        return false;
      }

      return true;
    });
  }, [workspaces, searchQuery, statusFilter, selectedCity]);

  // Handlers
  const handleSearchChange = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined })
    });
  };

  const handleStatusChange = (status: WorkspaceStatus | 'all') => {
    navigate({
      search: (prev) => ({ ...prev, status })
    });
  };

  const handleCityChange = (city: string) => {
    navigate({
      search: (prev) => ({ ...prev, city })
    });
  };

  const handleResetFilters = () => {
    navigate({
      search: () => ({ status: 'all', city: 'all' })
    });
  };

  const handleSelectWorkspace = (workspace: WorkspaceDirectoryItem) => {
    navigate({
      search: (prev) => ({ ...prev, hubId: workspace.id }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.hubId;
        return next;
      },
      replace: true,
      resetScroll: false
    });
  };

  const handleApprove = async (item: WorkspaceDirectoryItem) => {
    try {
      await reviewMutation.mutateAsync({
        id: item.id,
        dto: {
          reviewStatus: 'Approved',
          reviewedBy: 'USR-1882',
          reviewFeedback: 'Approved by Administrator.',
          expectedVersion: item.version ?? 1
        },
        workspaceName: item.name
      });
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleReject = async (item: WorkspaceDirectoryItem, reason: string) => {
    if (!reason || reason.trim().length < 5) {
      toast.error('Rejection Reason Required', {
        description: 'Please provide at least 5 characters explaining what needs correction.'
      });
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        id: item.id,
        dto: {
          reviewStatus: 'Rejected',
          reviewedBy: 'USR-1882',
          reviewFeedback: reason.trim(),
          expectedVersion: item.version ?? 1
        },
        workspaceName: item.name
      });
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleToggleSuspend = async (item: WorkspaceDirectoryItem, reason?: string) => {
    if (item.status === 'active') {
      if (!reason || reason.trim().length < 5) {
        toast.error('Suspension Reason Required', {
          description: 'A reason of at least 5 characters is required to suspend a workspace.'
        });
        return;
      }
      try {
        await moderateMutation.mutateAsync({
          id: item.id,
          dto: {
            moderationStatus: 'Suspended',
            suspendedBy: 'USR-1882',
            suspendReason: reason.trim(),
            expectedVersion: item.version ?? 1
          },
          workspaceName: item.name
        });
      } catch {
        // Error handled by mutation onError
      }
    } else {
      try {
        await moderateMutation.mutateAsync({
          id: item.id,
          dto: {
            moderationStatus: 'Normal',
            expectedVersion: item.version ?? 1
          },
          workspaceName: item.name
        });
      } catch {
        // Error handled by mutation onError
      }
    }
  };

  return (
    <PageContainer>
      <div className='max-w-[1360px] mx-auto w-full'>
        {/* Page Action Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <Link
                to='/dashboard/admin/workspaces'
                className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                <ArrowLeft className='size-3.5' aria-hidden='true' />
                <span>Workspace Administration</span>
              </Link>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Workspace Directory &amp; Moderation
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Review, approve, suspend, or restore platform flexible office hubs and dedicated partner clusters.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              disabled={isFetching}
              onClick={() => refetch()}
              className='gap-2 shadow-2xs'
            >
              <RefreshCw className={`size-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} aria-hidden='true' />
              <span>Refresh</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handleExportDirectory(workspaces.length)}
              className='gap-2 shadow-2xs'
            >
              <FileDown className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Export Directory (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <WorkspaceDirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          kpis={directoryKpis}
          onReset={handleResetFilters}
        />

        {/* Loading and Error States */}
        {isLoading && (
          <div className='p-12 text-center bg-card rounded-xl border border-border shadow-2xs flex flex-col items-center justify-center gap-3'>
            <RefreshCw className='size-6 text-primary animate-spin' aria-hidden='true' />
            <p className='text-xs text-muted-foreground'>Loading platform workspaces from centralized REST API...</p>
          </div>
        )}

        {isError && (
          <div className='p-8 text-center bg-card rounded-xl border border-rose-300 dark:border-rose-900/60 shadow-2xs flex flex-col items-center justify-center gap-3'>
            <AlertCircle className='size-8 text-rose-600 dark:text-rose-400' aria-hidden='true' />
            <h3 className='text-sm font-semibold text-foreground'>Failed to load workspace inventory</h3>
            <p className='text-xs text-muted-foreground max-w-md'>
              {error instanceof Error ? error.message : 'The server returned an error while retrieving workspaces.'}
            </p>
            <Button variant='outline' size='sm' onClick={() => refetch()} className='mt-2'>
              Retry Request
            </Button>
          </div>
        )}

        {/* Inventory Table */}
        {!isLoading && !isError && (
          <WorkspaceDirectoryTable
            items={filteredWorkspaces}
            selectedWorkspaceId={selectedWorkspace?.id}
            onSelectWorkspace={handleSelectWorkspace}
          />
        )}

        {/* Slide-over Inspection Drawer */}
        <WorkspaceDetailsDrawer
          workspace={selectedWorkspace}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onApprove={handleApprove}
          onReject={handleReject}
          onToggleSuspend={handleToggleSuspend}
          isSubmitting={isSubmitting}
        />
      </div>
    </PageContainer>
  );
}
