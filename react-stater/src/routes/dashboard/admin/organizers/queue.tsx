import React, { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Clock, History } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_VERIFICATION_APPLICATIONS,
  VerificationApplication
} from '@/features/admin-organizers/data/mock-organizers';
import { QueueFilterBar } from '@/features/admin-organizers/components/queue-filter-bar';
import { QueueRequestsTable } from '@/features/admin-organizers/components/queue-requests-table';
import { ProviderDetailsDrawer } from '@/features/admin-organizers/components/provider-details-drawer';

const queueSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'action_required']).optional(),
  dateRange: z.string().optional(),
  appId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/organizers/queue')({
  head: () => ({
    meta: [
      { title: 'A05 — Verification Requests Queue & Provider Details Panel | NexSpace Console' },
      {
        name: 'description',
        content: 'Review business legal documents and authorize workspace organizers.'
      }
    ]
  }),
  validateSearch: zodValidator(queueSearchSchema),
  component: VerificationQueuePage
});

function handleBatchAuditLogs() {
  toast.info('Batch Audit Logs (Simulated)', {
    description: 'Exported SecOps KYC decision audit trail logs for 17 partner submissions.'
  });
}

function VerificationQueuePage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const [applications, setApplications] = useState<VerificationApplication[]>(
    INITIAL_VERIFICATION_APPLICATIONS
  );
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.search || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'action_required'>(
    searchParams.status || 'all'
  );
  const [dateRange, setDateRange] = useState<string>(searchParams.dateRange || 'Last 14 Days');

  // Currently selected application for drawer inspection
  const selectedAppId = searchParams.appId || null;

  const activeApplication = useMemo(() => {
    if (!selectedAppId) return null;
    return applications.find((a) => a.id === selectedAppId || `#${a.id}` === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // Filtered applications based on search query and status filter
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter === 'pending' && app.status !== 'pending') return false;
      if (statusFilter === 'action_required' && app.status !== 'action_required' && app.status !== 'rejected') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.legalName.toLowerCase().includes(q);
        const matchTrade = app.tradeName.toLowerCase().includes(q);
        const matchTax = app.taxCode.toLowerCase().includes(q);
        const matchId = app.id.toLowerCase().includes(q);
        return matchName || matchTrade || matchTax || matchId;
      }

      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  const handleSelectApplication = (app: VerificationApplication) => {
    navigate({
      search: (prev) => ({ ...prev, appId: app.id }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    navigate({
      search: (prev) => ({ ...prev, appId: undefined }),
      replace: true,
      resetScroll: false
    });
  };

  const handleApprove = (appId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const updatedApp: VerificationApplication = {
            ...app,
            status: 'approved',
            statusLabel: 'Approved & Verified',
            auditTrail: [
              ...app.auditTrail,
              {
                id: `audit-${Date.now()}`,
                timestamp: 'Just now',
                relativeTime: 'Just now',
                type: 'decision',
                status: 'passed',
                title: 'Organizer Verification Approved',
                description: 'Full legal authorization granted with SecOps HSM Key #HSM-9921-X.',
                actor: 'Marcus Vance (CPTO)'
              }
            ]
          };
          toast.success(`Application #${appId} Approved (Simulated)`, {
            description: `${app.legalName} is now authorized to publish workspaces and activate booking checkout.`
          });
          return updatedApp;
        }
        return app;
      })
    );
    handleCloseDrawer();
  };

  const handleReject = (appId: string, reason: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const updatedApp: VerificationApplication = {
            ...app,
            status: 'action_required',
            statusLabel: 'Action Required',
            rejectionReason: reason || 'Legal documentation clarification requested by compliance team.',
            auditTrail: [
              ...app.auditTrail,
              {
                id: `audit-${Date.now()}`,
                timestamp: 'Just now',
                relativeTime: 'Just now',
                type: 'decision',
                status: 'critical',
                title: 'Correction Notice Dispatched',
                description: reason || 'Re-submission required for non-compliant documentation.',
                actor: 'Compliance Team'
              }
            ]
          };
          toast.error(`Application #${appId} Returned for Correction (Simulated)`, {
            description: `Correction request dispatched to ${app.legalName}. Status changed to Action Required.`
          });
          return updatedApp;
        }
        return app;
      })
    );
    handleCloseDrawer();
  };

  return (
    <PageContainer>
      <div className='max-w-[1440px] mx-auto w-full'>
        {/* Page Title & Header Actions */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Verification Requests Queue
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Review business legal documents and authorize workspace organizers.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-muted-foreground text-xs shadow-2xs'>
              <Clock className='size-4 text-amber-500' aria-hidden='true' />
              <span>Queue SLA: <strong className='text-foreground font-semibold'>4.2h avg</strong></span>
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={handleBatchAuditLogs}
              className='gap-2 shadow-2xs'
            >
              <History className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>Batch Audit Logs</span>
            </Button>
          </div>
        </div>

        {/* Queue Filter Bar Card */}
        <QueueFilterBar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            navigate({ search: (prev) => ({ ...prev, search: val || undefined }), replace: true });
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(st) => {
            setStatusFilter(st);
            navigate({ search: (prev) => ({ ...prev, status: st === 'all' ? undefined : st }), replace: true });
          }}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            navigate({ search: (prev) => ({ ...prev, dateRange: range }), replace: true });
          }}
        />

        {/* High-Density Requests Table (Master View) */}
        <QueueRequestsTable
          applications={filteredApplications}
          selectedAppId={selectedAppId}
          onSelectApplication={handleSelectApplication}
        />

        {/* Slide-Over Provider Details & Document Inspection Drawer */}
        <ProviderDetailsDrawer
          application={activeApplication}
          onClose={handleCloseDrawer}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </PageContainer>
  );
}
