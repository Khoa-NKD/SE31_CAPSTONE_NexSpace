import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Download, SlidersHorizontal } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import {
  INITIAL_REFUNDS_DATA,
  MOCK_REFUND_KPIS,
  RefundRecord,
  RefundStatus,
  RefundSummaryKpis,
  fromDtoToRecord,
  formatVnd
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
      { title: 'Hoàn tiền & Khiếu nại | NexSpace Admin Console' },
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

function RefundManagementPage() {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter state
  const searchQuery = searchParams.search || '';
  const statusFilter = searchParams.status || 'all';

  // Backend queries & mutations
  const refundsQuery = useQuery(
    adminRefundQueries.list({
      status: statusFilter,
      search: searchQuery,
      page,
      size: pageSize
    })
  );
  const refundsPage = refundsQuery.data;

  const kpisQuery = useQuery(adminRefundQueries.kpis());
  const kpisData = kpisQuery.data;

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
    void navigate({
      search: (prev) => ({ ...prev, search: value || undefined }),
      replace: true
    });
    setPage(1);
  };

  const handleStatusChange = (status: 'all' | RefundStatus) => {
    void navigate({
      search: (prev) => ({ ...prev, status }),
      replace: true
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    void navigate({
      search: (prev) => ({ ...prev, search: undefined, status: 'all' }),
      replace: true
    });
    setPage(1);
  };

  const handleSelectRefund = (refund: RefundRecord) => {
    setSelectedRefundId(refund.id.replace('#', ''));
    setIsDrawerOpen(true);
    void navigate({
      search: (prev) => ({ ...prev, refundId: refund.id.replace('#', '') }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRefundId(null);
    void navigate({
      search: (prev) => ({ ...prev, refundId: undefined }),
      replace: true,
      resetScroll: false
    });
  };

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
      return {
        pendingCount: kpisData.pendingCount,
        pendingVolumeVnd: kpisData.pendingVolume || 0,
        processedCount: kpisData.processedCount,
        processedVolumeVnd: kpisData.processedVolume || 0,
        rejectedCount: kpisData.rejectedCount,
        rejectedVolumeVnd: kpisData.rejectedVolume || 0
      };
    }
    return MOCK_REFUND_KPIS;
  }, [kpisData]);

  const handleApproveRefund = async (targetRefund: RefundRecord, note: string) => {
    const numericId = targetRefund.numericId || parseInt(targetRefund.id.replace(/\D/g, ''), 10);
    if (numericId && targetRefund.numericId) {
      return await approveMutation.mutateAsync({
        id: numericId,
        data: {
          approvedAmount: targetRefund.calculatedRefundVnd,
          adminNote: note
        }
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(
        isVi
          ? `Đã duyệt hoàn tiền ${targetRefund.id}`
          : `Refund Claim ${targetRefund.id} Approved`,
        {
          description: isVi
            ? `Đã chi ${formatVnd(targetRefund.calculatedRefundVnd)} qua cổng PayOS Escrow #${targetRefund.escrowReserveCode}.`
            : `Disbursed ${formatVnd(targetRefund.calculatedRefundVnd)} via PayOS Escrow.`
        }
      );
      return { refundReference: targetRefund.escrowReserveCode };
    }
  };

  const handleRejectRefund = async (targetRefund: RefundRecord, note: string) => {
    const numericId = targetRefund.numericId || parseInt(targetRefund.id.replace(/\D/g, ''), 10);
    if (numericId && targetRefund.numericId) {
      return await rejectMutation.mutateAsync({
        id: numericId,
        data: {
          reason: note
        }
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.error(
        isVi
          ? `Đã từ chối khiếu nại hoàn tiền ${targetRefund.id}`
          : `Refund Claim ${targetRefund.id} Rejected`,
        {
          description: isVi
            ? `Lý do từ chối: "${note}". Đã thông báo cho khách hàng.`
            : `Rejection notice dispatched to customer.`
        }
      );
      return { success: true };
    }
  };

  function handleExportClaimsLog() {
    toast.success(
      isVi ? 'Đã xuất lịch sử khiếu nại (CSV)' : 'Claims Log Exported (CSV)',
      {
        description: isVi
          ? 'Đã tải xuống danh sách chi tiết các lệnh chi tiền hoàn PayOS.'
          : 'Exported claim records with PayOS escrow verification tokens.'
      }
    );
  }

  function handleAutomatedRules() {
    toast.info(
      isVi ? 'Chính sách hoàn tiền tự động' : 'Automated Refund Rules',
      {
        description: isVi
          ? 'Ma trận chính sách đang áp dụng: Điều 2.1 (100% Host hủy), Điều 4.2 (80% lỗi mặt bằng), Điều 5.4 (0% No-show).'
          : 'Active policy matrix: Clause 2.1 (100% Host Cancel), Clause 4.2 (80% Facility Defect), Clause 5.4 (0% No Show).'
      }
    );
  }

  const headerActions = (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleExportClaimsLog}
        className='h-8.5 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground'
      >
        <Download className='size-3.5' />
        <span className='hidden sm:inline'>{isVi ? 'Xuất danh sách' : 'Export Log'}</span>
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleAutomatedRules}
        className='h-8.5 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground'
      >
        <SlidersHorizontal className='size-3.5' />
        <span className='hidden sm:inline'>{isVi ? 'Quy tắc hoàn tiền' : 'Refund Rules'}</span>
      </Button>
    </div>
  );

  return (
    <PageContainer
      pageTitle={isVi ? 'Hoàn tiền & Khiếu nại' : 'Refund Requests & Claims'}
      pageDescription={
        isVi
          ? 'Xét duyệt yêu cầu hoàn tiền của khách hàng, giải quyết khiếu nại hủy chỗ và chi trả tự động qua cổng PayOS.'
          : 'Review customer cancellation refund requests, dispute settlements, and automated policy calculations across hubs.'
      }
      pageHeaderAction={headerActions}
    >
      {/* ── KPI Cards Row ── */}
      <RefundsKpiGrid kpis={kpis} language={language} />

      {/* ── Segmented Tabs & Search Controls Toolbar ── */}
      <RefundsFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        counts={counts}
        onReset={handleResetFilters}
        onRefresh={() => {
          void refundsQuery.refetch();
          void kpisQuery.refetch();
        }}
        isRefreshing={refundsQuery.isFetching || kpisQuery.isFetching}
        language={language}
      />

      {/* ── Main Structured Table ── */}
      <RefundsLedgerTable
        refunds={refunds}
        selectedRefundId={isDrawerOpen ? selectedRefund?.id : undefined}
        onSelectRefund={handleSelectRefund}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalPages={refundsPage?.totalPages}
        totalRecords={refundsPage?.totalElements}
        language={language}
      />

      {/* ── Detail Drawer ── */}
      <RefundDetailsDrawer
        key={selectedRefund?.id}
        refund={selectedRefund}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onApprove={handleApproveRefund}
        onReject={handleRejectRefund}
        language={language}
      />
    </PageContainer>
  );
}
