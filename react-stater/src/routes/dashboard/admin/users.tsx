import React, { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
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
import { FileDown, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_MOCK_USERS,
  AdminUserRecord
} from '@/features/admin-users/data/mock-users';
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
  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.search || '');
  const [selectedRole, setSelectedRole] = useState<string>(searchParams.role || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.status || 'all');
  const [selectedKyc, setSelectedKyc] = useState<string>(searchParams.kyc || 'all');

  // Drawer is closed by default unless explicitly opened by a deep-link search param
  const selectedUserId = searchParams.userId || null;
  const [showNewUserModal, setShowNewUserModal] = useState<boolean>(false);

  // Active user for the drawer
  const activeDrawerUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const handleSelectUser = (u: AdminUserRecord) => {
    navigate({
      search: (prev) => ({ ...prev, userId: u.id }),
      replace: true
    });
  };

  const handleCloseDrawer = () => {
    navigate({
      search: (prev) => ({ ...prev, userId: undefined }),
      replace: true
    });
  };

  // Toggle user status between Active and Locked
  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id === userId) {
          const nextStatus = user.status === 'Locked' ? 'Active' : 'Locked';
          toast.success(
            nextStatus === 'Locked'
              ? `Account ${user.name} Locked (Simulated)`
              : `Account ${user.name} Unlocked (Simulated)`,
            {
              description: `User moderation status changed to ${nextStatus}.`
            }
          );
          return {
            ...user,
            status: nextStatus
          };
        }
        return user;
      })
    );
  };

  // Filtered accounts
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (selectedRole !== 'all' && user.role !== selectedRole) {
        return false;
      }
      if (selectedStatus !== 'all' && user.status !== selectedStatus) {
        return false;
      }
      if (selectedKyc !== 'all' && user.kycStatus !== selectedKyc) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = user.name.toLowerCase().includes(query);
        const matchesEmail = user.email.toLowerCase().includes(query);
        const matchesId = user.id.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }
      return true;
    });
  }, [users, selectedRole, selectedStatus, selectedKyc, searchQuery]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedStatus('all');
    setSelectedKyc('all');
  };

  const handleExportCsv = () => {
    toast.success('Accounts CSV Export Dispatched (Simulated)', {
      description: `Downloaded report for ${filteredUsers.length} accounts.`
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

        {/* 4. High-Density Users Data Table */}
        <UserAccountsTable
          users={filteredUsers}
          selectedUserId={selectedUserId || undefined}
          onSelectUser={handleSelectUser}
        />

        {/* 5. Slide-Over Detail Drawer (560px Wide) */}
        <UserDetailsDrawer
          user={activeDrawerUser}
          onClose={handleCloseDrawer}
          onToggleStatus={handleToggleStatus}
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
