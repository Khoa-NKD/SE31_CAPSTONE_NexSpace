import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_REFUNDS_DATA,
  MOCK_REFUND_KPIS,
  RefundRecord,
  RefundStatus
} from '@/features/admin-refunds/data/mock-refunds';
import { RefundsKpiGrid } from '@/features/admin-refunds/components/refunds-kpi-grid';
import { RefundsFilterBar } from '@/features/admin-refunds/components/refunds-filter-bar';
import { RefundsLedgerTable } from '@/features/admin-refunds/components/refunds-ledger-table';
import { RefundDetailsDrawer } from '@/features/admin-refunds/components/refund-details-drawer';

const refundsSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'processed', 'rejected']).optional().default('all'),
  hub: z.string().optional().default('all'),
  timeRange: z.string().optional().default('30d'),
  refundId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/refunds')({
  head: () => ({
    meta: [
      { title: 'A10 — Refund Management & Claims | NexSpace Console' },
      {
        name: 'description',
        content:
          'Review customer cancellation refund requests, dispute settlements, and automated policy calculations across hubs.'
      }
    ]
  }),
  validateSearch: zodValidator(refundsSearchSchema),
  component: RefundManagementPage
});

function handleExportClaimsLog() {
  toast.success('Claims Log Exported (CSV)', {
    description: 'Exported 32 claim records with PayOS escrow verification tokens.'
  });
}

function handleAutomatedRules() {
  toast.info('Automated Refund Rules', {
    description:
      'Active policy matrix: Clause 2.1 (100% Host Cancel), Clause 4.2 (80% Facility Defect), Clause 5.4 (0% No Show).'
  });
}

function RefundManagementPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [refunds, setRefunds] = useState<RefundRecord[]>(INITIAL_REFUNDS_DATA);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(() => {
    if (searchParams.refundId) {
      return (
        INITIAL_REFUNDS_DATA.find((r) => r.id === searchParams.refundId || r.id === `#${searchParams.refundId}`) ||
        null
      );
    }
    return null;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(
    () => Boolean(searchParams.refundId)
  );
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Filter state
  const searchQuery = searchParams.search || '';
  const statusFilter = searchParams.status || 'all';
  const selectedHub = searchParams.hub || 'all';
  const timeRange = searchParams.timeRange || '30d';

  // Handlers for URL search sync
  const handleSearchChange = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined }),
      replace: true
    });
    setPage(1);
  };

  const handleStatusChange = (status: 'all' | RefundStatus) => {
    navigate({
      search: (prev) => ({ ...prev, status }),
      replace: true
    });
    setPage(1);
  };

  const handleHubChange = (hub: string) => {
    navigate({
      search: (prev) => ({ ...prev, hub }),
      replace: true
    });
    setPage(1);
  };

  const handleTimeRangeChange = (range: string) => {
    navigate({
      search: (prev) => ({ ...prev, timeRange: range }),
      replace: true
    });
  };

  const handleSelectRefund = (refund: RefundRecord) => {
    setSelectedRefund(refund);
    setIsDrawerOpen(true);
    navigate({
      search: (prev) => ({ ...prev, refundId: refund.id.replace('#', '') }),
      replace: true
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRefund(null);
    navigate({
      search: (prev) => ({ ...prev, refundId: undefined }),
      replace: true
    });
  };

  // Filtered dataset
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      // Hub filter
      if (selectedHub !== 'all' && !r.workspaceHub.toLowerCase().includes(selectedHub.toLowerCase())) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = r.id.toLowerCase().includes(query);
        const matchesBooking = r.bookingRef.toLowerCase().includes(query);
        const matchesCustomer = r.customerName.toLowerCase().includes(query) || r.customerEmail.toLowerCase().includes(query);
        const matchesHub = r.workspaceHub.toLowerCase().includes(query);
        const matchesReason = r.claimReason.toLowerCase().includes(query);
        return matchesId || matchesBooking || matchesCustomer || matchesHub || matchesReason;
      }
      return true;
    });
  }, [refunds, statusFilter, selectedHub, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: refunds.length,
      pending: refunds.filter((r) => r.status === 'pending').length,
      processed: refunds.filter((r) => r.status === 'processed').length,
      rejected: refunds.filter((r) => r.status === 'rejected').length
    };
  }, [refunds]);

  // Simulated state updates
  const handleApproveRefund = (targetRefund: RefundRecord, note: string) => {
    setRefunds((prev) =>
      prev.map((item) =>
        item.id === targetRefund.id
          ? {
              ...item,
              status: 'processed',
              statusBadge: 'Processed & Disbursed',
              adminResolutionNote: note,
              slaRemaining: 'Closed',
              triggeredAt: 'Completed via PayOS Escrow Auto-Payout'
            }
          : item
      )
    );
    setSelectedRefund((prev) =>
      prev && prev.id === targetRefund.id
        ? {
            ...prev,
            status: 'processed',
            statusBadge: 'Processed & Disbursed',
            adminResolutionNote: note,
            slaRemaining: 'Closed',
            triggeredAt: 'Completed via PayOS Escrow Auto-Payout'
          }
        : prev
    );
    toast.success(`Refund Claim ${targetRefund.id} Approved (Simulated)`, {
      description: `Disbursed $${targetRefund.calculatedRefundUsd.toFixed(2)} (${targetRefund.calculatedRefundVnd.toLocaleString()} VND) via PayOS Escrow Reserve #${targetRefund.escrowReserveCode}.`
    });
  };

  const handleRejectRefund = (targetRefund: RefundRecord, note: string) => {
    setRefunds((prev) =>
      prev.map((item) =>
        item.id === targetRefund.id
          ? {
              ...item,
              status: 'rejected',
              statusBadge: 'Claim Rejected',
              adminResolutionNote: note,
              slaRemaining: 'Closed',
              triggeredAt: 'Rejected by Administrator'
            }
          : item
      )
    );
    setSelectedRefund((prev) =>
      prev && prev.id === targetRefund.id
        ? {
            ...prev,
            status: 'rejected',
            statusBadge: 'Claim Rejected',
            adminResolutionNote: note,
            slaRemaining: 'Closed',
            triggeredAt: 'Rejected by Administrator'
          }
        : prev
    );
    toast.error(`Refund Claim ${targetRefund.id} Denied (Simulated)`, {
      description: `Dispute rejection notice appended to SOC-2 compliance audit log.`
    });
  };

  return (
    <PageContainer
      pageTitle='Refund Requests & Claims'
      pageDescription='Review customer cancellation refund requests, dispute settlements, and automated policy calculations.'
    >
      {/* Header Action Buttons */}
      <div className='flex items-center justify-end gap-3 mb-6 -mt-12 sm:mt-0'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleExportClaimsLog}
          className='flex items-center gap-2 h-9 text-xs font-semibold'
        >
          <Download className='size-3.5' />
          <span>Export Claims Log</span>
        </Button>
        <Button
          type='button'
          size='sm'
          onClick={handleAutomatedRules}
          className='flex items-center gap-2 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
        >
          <SlidersHorizontal className='size-3.5' />
          <span>Automated Refund Rules</span>
        </Button>
      </div>

      {/* KPI Cards Row */}
      <RefundsKpiGrid kpis={MOCK_REFUND_KPIS} />

      {/* Filter Bar */}
      <RefundsFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        selectedHub={selectedHub}
        onHubChange={handleHubChange}
        counts={counts}
      />

      {/* Main Table */}
      <RefundsLedgerTable
        refunds={filteredRefunds}
        selectedRefundId={isDrawerOpen ? selectedRefund?.id : undefined}
        onSelectRefund={handleSelectRefund}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
      />

      {/* 600px Detail Drawer */}
      <RefundDetailsDrawer
        key={selectedRefund?.id}
        refund={selectedRefund}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onApprove={handleApproveRefund}
        onReject={handleRejectRefund}
      />
    </PageContainer>
  );
}
