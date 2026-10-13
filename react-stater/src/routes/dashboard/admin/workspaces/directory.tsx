import React, { useState, useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_WORKSPACE_DIRECTORY,
  MOCK_DIRECTORY_KPIS,
  WorkspaceDirectoryItem,
  WorkspaceStatus
} from '@/features/admin-workspaces/data/mock-workspaces-directory';
import { WorkspaceDirectoryFilters } from '@/features/admin-workspaces/components/workspace-directory-filters';
import { WorkspaceDirectoryTable } from '@/features/admin-workspaces/components/workspace-directory-table';
import { WorkspaceDetailsDrawer } from '@/features/admin-workspaces/components/workspace-details-drawer';

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

function handleExportDirectory() {
  toast.success('Workspace Directory Exported (CSV)', {
    description: 'Downloaded metadata and compliance records for 618 workspaces.'
  });
}

function WorkspaceDirectoryPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [workspaces, setWorkspaces] = useState<WorkspaceDirectoryItem[]>(INITIAL_WORKSPACE_DIRECTORY);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDirectoryItem | null>(() => {
    if (searchParams.hubId) {
      return INITIAL_WORKSPACE_DIRECTORY.find((w) => w.id === searchParams.hubId) || null;
    }
    return null;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => Boolean(searchParams.hubId));

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
    setSelectedWorkspace(workspace);
    setIsDrawerOpen(true);
    navigate({
      search: (prev) => ({ ...prev, hubId: workspace.id })
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.hubId;
        return next;
      }
    });
  };

  const handleApprove = (item: WorkspaceDirectoryItem) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === item.id ? { ...w, status: 'active' as WorkspaceStatus } : w))
    );
    setSelectedWorkspace((prev) => (prev?.id === item.id ? { ...prev, status: 'active' } : prev));
    toast.success(`Workspace Approved & Published`, {
      description: `${item.name} (#${item.id}) is now active and indexed on the consumer marketplace.`
    });
  };

  const handleReject = (item: WorkspaceDirectoryItem, reason: string) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === item.id ? { ...w, status: 'suspended' as WorkspaceStatus, moderatorNotes: reason } : w))
    );
    setSelectedWorkspace((prev) =>
      prev?.id === item.id ? { ...prev, status: 'suspended', moderatorNotes: reason } : prev
    );
    toast.error(`Workspace Listing Returned`, {
      description: `Correction request sent to ${item.organizerLegalName}. Feedback logged.`
    });
  };

  const handleToggleSuspend = (item: WorkspaceDirectoryItem) => {
    const nextStatus: WorkspaceStatus = item.status === 'active' ? 'suspended' : 'active';
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === item.id ? { ...w, status: nextStatus } : w))
    );
    setSelectedWorkspace((prev) => (prev?.id === item.id ? { ...prev, status: nextStatus } : prev));
    toast.info(`Status Updated`, {
      description: `${item.name} (#${item.id}) transitioned to ${nextStatus}.`
    });
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
              onClick={handleExportDirectory}
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
          kpis={MOCK_DIRECTORY_KPIS}
          onReset={handleResetFilters}
        />

        {/* Inventory Table */}
        <WorkspaceDirectoryTable
          items={filteredWorkspaces}
          selectedWorkspaceId={selectedWorkspace?.id}
          onSelectWorkspace={handleSelectWorkspace}
        />

        {/* Slide-over Inspection Drawer */}
        <WorkspaceDetailsDrawer
          workspace={selectedWorkspace}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onApprove={handleApprove}
          onReject={handleReject}
          onToggleSuspend={handleToggleSuspend}
        />
      </div>
    </PageContainer>
  );
}
