import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
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
import { History, ArrowRight } from 'lucide-react';
import { MOCK_ROLE_KPIS } from '@/features/admin-roles/data/mock-roles';
import { RoleKpiSummary } from '@/features/admin-roles/components/role-kpi-summary';
import { FixedRoleNotice } from '@/features/admin-roles/components/fixed-role-notice';
import { RolePermissionMatrix } from '@/features/admin-roles/components/role-permission-matrix';

export const Route = createFileRoute('/dashboard/admin/roles')({
  head: () => ({
    meta: [
      { title: 'A02 — Users & Role Permissions | NexSpace Console' },
      { name: 'description', content: 'Overview of fixed business roles and platform permission mappings.' }
    ]
  }),
  component: RolesPermissionsPage
});

function RolesPermissionsPage() {
  const [showAuditModal, setShowAuditModal] = useState(false);

  return (
    <PageContainer>
      <div className='flex flex-col min-h-screen pb-12 min-w-0 w-full'>
        {/* Page Header Row */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground font-heading'>
              Users &amp; Role Permissions
            </h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              Overview of fixed business roles and platform permission mappings across tenancy surfaces.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Role Audit Trail Modal Trigger */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowAuditModal(true)}
              className='inline-flex items-center gap-1.5 h-8 text-xs font-semibold'
            >
              <History className='size-3.5 text-muted-foreground' />
              <span>Role Audit Trail</span>
            </Button>

            {/* Manage Users Navigation Link */}
            <Button
              asChild
              size='sm'
              className='bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-semibold gap-1.5 shadow-xs'
            >
              <Link to='/dashboard/admin/users'>
                <span>Manage Users List</span>
                <ArrowRight className='size-3.5' />
              </Link>
            </Button>
          </div>
        </div>

        {/* 3. Summary KPI Cards Row (4 Cards) */}
        <RoleKpiSummary kpis={MOCK_ROLE_KPIS} />

        {/* 4. Fixed Role Architecture Notice */}
        <FixedRoleNotice />

        {/* 5. Role Permission Matrix (White Card with Table & Docked Bar) */}
        <RolePermissionMatrix />

        {/* Supplementary Footnote */}
        <div className='mt-4 pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2'>
          <div className='flex items-center gap-2'>
            <span>NexSpace Platform Operations v4.19.2-rc4</span>
            <span>•</span>
            <span>Hardware Enclave HSM Active</span>
            <span>•</span>
            <span className='font-mono'>Zone: ap-southeast-1a</span>
          </div>
          <div>All policy changes cryptographically signed by session root key</div>
        </div>

        {/* Role Audit Trail Informational Dialog */}
        <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <History className='size-5 text-indigo-600' />
                <span>Role Audit Trail (Simulated Log)</span>
              </DialogTitle>
              <DialogDescription className='pt-1 text-xs text-muted-foreground'>
                Recent permission changes recorded in immutable SOC2 access ledger.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-2.5 text-xs bg-muted/40 p-3 rounded-lg border border-border'>
              <div className='flex justify-between border-b border-border/60 pb-1.5'>
                <span className='font-medium text-foreground'>refund:approve granted to Organizer</span>
                <span className='text-muted-foreground text-[11px]'>Oct 22, 2025</span>
              </div>
              <div className='flex justify-between border-b border-border/60 pb-1.5'>
                <span className='font-medium text-foreground'>review:dispute_flag enabled for Customer</span>
                <span className='text-muted-foreground text-[11px]'>Oct 18, 2025</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium text-foreground'>Root policy signature verified</span>
                <span className='text-muted-foreground text-[11px]'>Oct 10, 2025</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={() => setShowAuditModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
