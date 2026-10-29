import React, { useState, useMemo, useDeferredValue } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { FileDown, UserPlus, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminUsersQueryOptions,
  adminUserDetailQueryOptions,
  useUpdateUserStatusMutation,
  type AdminUserRecord
} from '@/features/admin-users/api';
import { UserFiltersBar } from '@/features/admin-users/components/user-filters-bar';
import { UserAccountsTable } from '@/features/admin-users/components/user-accounts-table';
import { UserDetailsDrawer } from '@/features/admin-users/components/user-details-drawer';

const usersSearchSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  kyc: z.string().optional(),
  userId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/users')({
  head: () => ({
    meta: [
      { title: 'A03 — Users List & User Details Drawer | NexSpace Console' },
      { name: 'description', content: 'Inspect, manage, and moderate platform accounts across all operational roles.' }
    ]
  }),
  validateSearch: zodValidator(usersSearchSchema),
  component: AdminUsersListPage
});

function AdminUsersListPage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  // Filter UI state
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.search || '');
  const [selectedRole, setSelectedRole] = useState<string>(searchParams.role || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.status || 'all');
  const [selectedKyc, setSelectedKyc] = useState<string>(searchParams.kyc || 'all');

  // Defer search input to throttle live API queries
  const deferredSearch = useDeferredValue(searchQuery);

  // Active query filters passed to Mock REST API
  const queryFilters = useMemo(
    () => ({
      search: deferredSearch.trim() || undefined,
      role: selectedRole !== 'all' ? selectedRole : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      kyc: selectedKyc !== 'all' ? selectedKyc : undefined
    }),
    [deferredSearch, selectedRole, selectedStatus, selectedKyc]
  );

  // Query live user accounts from Mock REST API
  const {
    data: usersPage,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(adminUsersQueryOptions(queryFilters));

  const users = useMemo(() => usersPage?.content ?? [], [usersPage?.content]);

  // Selected User ID for Drawer
  const selectedUserId = searchParams.userId || null;
  const [showNewUserModal, setShowNewUserModal] = useState<boolean>(false);

  // Fetch single user detail when drawer is open
  const detailQuery = useQuery(adminUserDetailQueryOptions(selectedUserId));

  // Resolved drawer user (detail query preferred, falling back to list record)
  const activeDrawerUser = useMemo(() => {
    if (!selectedUserId) return null;
    return detailQuery.data || users.find((u) => u.id === selectedUserId) || null;
  }, [selectedUserId, detailQuery.data, users]);

  // Mutation hook for updating user moderation status
  const updateStatusMutation = useUpdateUserStatusMutation();

  const handleSelectUser = (u: AdminUserRecord) => {
    navigate({
      search: (prev) => ({ ...prev, userId: u.id }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    navigate({
      search: (prev) => ({ ...prev, userId: undefined }),
      replace: true,
      resetScroll: false
    });
  };

  // Toggle user status between Active and Locked via real PATCH API
  const handleToggleStatus = (userId: string) => {
    const targetUser = activeDrawerUser || users.find((u) => u.id === userId);
    if (!targetUser) return;

    const nextStatus = targetUser.status === 'Locked' ? 'Active' : 'Locked';

    updateStatusMutation.mutate({
      userId,
      nextStatus,
      userName: targetUser.name
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedStatus('all');
    setSelectedKyc('all');
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        role: undefined,
        status: undefined,
        kyc: undefined
      }),
      replace: true,
      resetScroll: false
    });
  };

  const handleExportCsv = () => {
    toast.success('Accounts CSV Export Dispatched (Simulated)', {
      description: `Downloaded report for ${users.length} accounts.`
    });
  };

  return (
    <PageContainer>
      <div className='flex flex-col min-h-screen pb-16 min-w-0 w-full'>
        {/* Header Row */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground font-heading'>
              User Accounts
            </h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              Inspect, manage, and moderate platform accounts across all operational roles.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              className='h-8 text-xs font-semibold gap-1.5 shadow-2xs'
            >
              <FileDown className='size-3.5 text-muted-foreground' />
              <span>Export CSV</span>
            </Button>

            <Button
              size='sm'
              onClick={() => setShowNewUserModal(true)}
              className='h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90'
            >
              <UserPlus className='size-3.5' />
              <span>+ New User</span>
            </Button>
          </div>
        </div>

        {/* 3. Search & Filter Bar Card */}
        <UserFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedKyc={selectedKyc}
          onKycChange={setSelectedKyc}
          onResetAll={handleResetFilters}
        />

        {/* API Error Notification if server is unavailable */}
        {isError && (
          <div className='mb-4 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-800 dark:text-red-200'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='size-4 text-red-600 shrink-0' />
              <span>
                <strong>Unable to connect to Mock REST API:</strong>{' '}
                {error instanceof Error ? error.message : 'HTTP request failed'}. Please ensure the mock server is running on port 4000.
              </span>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='h-7 text-xs gap-1 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50'
            >
              <RefreshCw className='size-3' />
              <span>Retry Request</span>
            </Button>
          </div>
        )}

        {/* 4. High-Density Users Data Table */}
        <UserAccountsTable
          users={users}
          selectedUserId={selectedUserId || undefined}
          onSelectUser={handleSelectUser}
          isLoading={isLoading}
        />

        {/* 5. Slide-Over Detail Drawer (560px Wide) */}
        <UserDetailsDrawer
          user={activeDrawerUser}
          onClose={handleCloseDrawer}
          onToggleStatus={handleToggleStatus}
          isUpdatingStatus={updateStatusMutation.isPending}
        />

        {/* New User Modal (Simulated) */}
        <Dialog open={showNewUserModal} onOpenChange={setShowNewUserModal}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <UserPlus className='size-5 text-indigo-600' />
                <span>Create User Account (Simulated)</span>
              </DialogTitle>
              <DialogDescription className='pt-1 text-xs text-muted-foreground'>
                Account provisioning is managed through verified email invites in production.
              </DialogDescription>
            </DialogHeader>

            <div className='p-3.5 bg-muted/40 rounded-lg text-xs space-y-2 border border-border text-foreground'>
              <p>
                In production, new user accounts register via the public portal or through enterprise SAML SSO.
              </p>
              <p className='text-muted-foreground text-[11px]'>
                Administrative invitation flow will connect to backend user management endpoints in future releases.
              </p>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={() => setShowNewUserModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
