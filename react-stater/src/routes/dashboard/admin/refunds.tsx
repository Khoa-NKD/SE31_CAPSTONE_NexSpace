import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Download, SlidersHorizontal } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import {
  INITIAL_REFUNDS_DATA,
  MOCK_REFUND_KPIS,
  RefundRecord,
  RefundStatus,
  RefundSummaryKpis,
  fromDtoToRecord
} from '@/features/admin-refunds/data/mock-refunds';
import { adminRefundQueries } from '@/features/admin-refunds/api/queries';
import {
  useApproveRefundMutation,
  useRejectRefundMutation
} from '@/features/admin-refunds/api/mutations';
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

  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Filter state
  const searchQuery = searchParams.search || '';
  const statusFilter = searchParams.status || 'all';
  const selectedHub = searchParams.hub || 'all';
  const timeRange = searchParams.timeRange || '30d';

  // Backend queries & mutations
  const { data: refundsPage } = useQuery(
    adminRefundQueries.list({
      status: statusFilter,
      search: searchQuery,
      page,
      size: pageSize
    })
  );

  const { data: kpisData } = useQuery(adminRefundQueries.kpis());

  const approveMutation = useApproveRefundMutation();
  const rejectMutation = useRejectRefundMutation();

  const refunds: RefundRecord[] = useMemo(() => {
    if (refundsPage?.content && refundsPage.content.length > 0) {
      return refundsPage.content.map(fromDtoToRecord);
    }
    if (refundsPage && refundsPage.totalElements === 0) {
      return [];
    }
    return INITIAL_REFUNDS_DATA;
  }, [refundsPage]);

  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(
    () => (searchParams.refundId ? searchParams.refundId.replace('#', '') : null)
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(
    () => Boolean(searchParams.refundId)
  );

  const selectedRefund = useMemo(() => {
    const idToFind = selectedRefundId || (searchParams.refundId ? searchParams.refundId.replace('#', '') : null);
    if (!idToFind) return null;
    return (
      refunds.find(
        (r) => r.id.replace('#', '') === idToFind || (r.numericId && String(r.numericId) === idToFind)
      ) ||
      INITIAL_REFUNDS_DATA.find(
        (r) => r.id.replace('#', '') === idToFind || (r.numericId && String(r.numericId) === idToFind)
      ) ||
      null
    );
  }, [selectedRefundId, searchParams.refundId, refunds]);

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
    setSelectedRefundId(refund.id.replace('#', ''));
    setIsDrawerOpen(true);
    navigate({
      search: (prev) => ({ ...prev, refundId: refund.id.replace('#', '') }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRefundId(null);
    navigate({
      search: (prev) => ({ ...prev, refundId: undefined }),
      replace: true,
      resetScroll: false
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
    if (kpisData) {
      return {
        all: kpisData.pendingCount + kpisData.processedCount + kpisData.rejectedCount,
        pending: kpisData.pendingCount,
        processed: kpisData.processedCount,
        rejected: kpisData.rejectedCount
      };
    }
    return {
      all: refunds.length,
      pending: refunds.filter((r) => r.status === 'pending').length,
      processed: refunds.filter((r) => r.status === 'processed').length,
      rejected: refunds.filter((r) => r.status === 'rejected').length
    };
  }, [kpisData, refunds]);

  const kpis: RefundSummaryKpis = useMemo(() => {
    if (kpisData) {
      const usdRate = 25450;
      return {
        pendingCount: kpisData.pendingCount,
        pendingVolumeUsd: (kpisData.pendingVolume || 0) / usdRate,
        processedCount: kpisData.processedCount,
        processedVolumeUsd: (kpisData.processedVolume || 0) / usdRate,
        rejectedCount: kpisData.rejectedCount,
        rejectedVolumeUsd: (kpisData.rejectedVolume || 0) / usdRate
      };
    }
    return MOCK_REFUND_KPIS;
  }, [kpisData]);

  const handleApproveRefund = (targetRefund: RefundRecord, note: string) => {
    const numericId = targetRefund.numericId || parseInt(targetRefund.id.replace(/\D/g, ''), 10);
    if (numericId && targetRefund.numericId) {
      approveMutation.mutate({
        id: numericId,
        data: {
          approvedAmount: targetRefund.calculatedRefundVnd,
          adminNote: note
        }
      });
    } else {
      toast.success(`Refund Claim ${targetRefund.id} Approved (Simulated)`, {
        description: `Disbursed $${targetRefund.calculatedRefundUsd.toFixed(2)} (${targetRefund.calculatedRefundVnd.toLocaleString()} VND) via PayOS Escrow Reserve #${targetRefund.escrowReserveCode}.`
      });
    }
  };

  const handleRejectRefund = (targetRefund: RefundRecord, note: string) => {
    const numericId = targetRefund.numericId || parseInt(targetRefund.id.replace(/\D/g, ''), 10);
    if (numericId && targetRefund.numericId) {
      rejectMutation.mutate({
        id: numericId,
        data: { reason: note || 'Không đủ điều kiện hoàn tiền' }
      });
    } else {
      toast.error(`Refund Claim ${targetRefund.id} Denied (Simulated)`);
    }
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
      <RefundsKpiGrid kpis={kpis} />

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
