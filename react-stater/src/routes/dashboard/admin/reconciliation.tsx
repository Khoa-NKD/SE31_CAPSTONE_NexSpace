import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { useQueryClient } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_TRANSACTIONS,
  TransactionRecord,
  TransactionStatus
} from '@/features/admin-reconciliation/data/mock-transactions';
import {
  mapPaymentTransactionToRecord,
  calculateLiveFinancialKpis,
  exportAuditLogToCsv
} from '@/features/admin-reconciliation/data/transaction-adapter';
import { FinancialKpiGrid } from '@/features/admin-reconciliation/components/financial-kpi-grid';
import { TransactionsFilterBar } from '@/features/admin-reconciliation/components/transactions-filter-bar';
import { TransactionsLedgerTable } from '@/features/admin-reconciliation/components/transactions-ledger-table';
import { TransactionDetailsDrawer } from '@/features/admin-reconciliation/components/transaction-details-drawer';
import {
  useAdminPaymentHistory,
  useReconcileTransaction,
  useBatchReconcile,
  useReconciliationSummary,
  paymentKeys
} from '@/features/payments/api';

const reconciliationSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'settled', 'pending', 'failed', 'refunded']).optional().default('all'),
  gateway: z.string().optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  txId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/reconciliation')({
  head: () => ({
    meta: [
      { title: 'A09 — Đối soát giao dịch & Chi trả | NexSpace Console' },
      {
        name: 'description',
        content: 'Giám sát tổng doanh thu hệ thống, dòng tiền ký quỹ PayOS, phí hoa hồng nền tảng và thanh toán giải ngân đối tác.'
      }
    ]
  }),
  validateSearch: zodValidator(reconciliationSearchSchema),
  component: FinancialReconciliationPage
});

function FinancialReconciliationPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();

  const page = searchParams.page || 1;
  const pageSize = searchParams.pageSize || 10;
  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as TransactionStatus | 'all') || 'all';
  const selectedGateway = searchParams.gateway || 'all';

  // 1. Fetch live transactions and reconciliation summary from backend
  const {
    data: paymentsPage,
    isLoading: isPaymentsLoading,
    isFetching: isPaymentsFetching
  } = useAdminPaymentHistory({
    page,
    size: pageSize,
    sort: 'createdAt'
  });

  const { data: reconciliationSummary } = useReconciliationSummary();
  const batchMutation = useBatchReconcile();
  const reconcileMutation = useReconcileTransaction();

  // 2. Transform backend payment transactions to TransactionRecord UI format
  const baseTransactions = useMemo<TransactionRecord[]>(() => {
    const rawList = paymentsPage?.content || paymentsPage?.listObjects;
    if (rawList && rawList.length > 0) {
      return rawList.map(mapPaymentTransactionToRecord);
    }
    // Fallback to demo mock data if DB has no records yet
    return INITIAL_TRANSACTIONS;
  }, [paymentsPage]);

  // Local state for optimistic updates upon manual reconciliation
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<TransactionRecord>>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => Boolean(searchParams.txId));
  const [isReconcilingBatch, setIsReconcilingBatch] = useState(false);

  // Merge base transactions with local optimistic overrides
  const transactions = useMemo(() => {
    return baseTransactions.map((tx) => {
      const override = localOverrides[tx.id] || localOverrides[tx.payOsOrderCode];
      return override ? { ...tx, ...override } : tx;
    });
  }, [baseTransactions, localOverrides]);

  // Sync selected transaction with txId search param
  React.useEffect(() => {
    if (searchParams.txId) {
      const found = transactions.find((t) => t.id === searchParams.txId || t.payOsOrderCode === searchParams.txId);
      if (found) {
        setSelectedTransaction(found);
        setIsDrawerOpen(true);
      }
    }
  }, [searchParams.txId, transactions]);

  // Handle URL updates cleanly
  const updateFilters = (
    updates: Partial<{
      search: string;
      status: TransactionStatus | 'all';
      gateway: string;
      page: number;
      pageSize: number;
      txId?: string;
    }>
  ) => {
    navigate({
      search: (prev) => {
        const next: Record<string, unknown> = { ...prev, ...updates };
        if (!next.search) delete next.search;
        if (next.status === 'all') delete next.status;
        if (next.gateway === 'all') delete next.gateway;
        if (next.page === 1) delete next.page;
        if (next.pageSize === 10) delete next.pageSize;
        if (!next.txId) delete next.txId;
        return next as typeof prev;
      },
      replace: true,
      resetScroll: false
    });
  };

  const handleSelectTransaction = (item: TransactionRecord) => {
    setSelectedTransaction(item);
    setIsDrawerOpen(true);
    updateFilters({ txId: item.id });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    updateFilters({ txId: undefined });
  };

  // Reconcile a single transaction with PayOS
  const handleReconcileTransaction = (target: TransactionRecord) => {
    const orderCodeNum = Number(target.payOsOrderCode);
    if (!isNaN(orderCodeNum) && orderCodeNum > 0) {
      reconcileMutation.mutate(orderCodeNum, {
        onSuccess: (res) => {
          setLocalOverrides((prev) => ({
            ...prev,
            [target.id]: {
              status: res.reconciliationStatus === 'MATCHED' ? 'settled' : 'failed',
              reconciled: res.reconciliationStatus === 'MATCHED',
              statusBadge:
                res.reconciliationStatus === 'MATCHED' ? 'Settled & Matched 100%' : 'Mismatch Detected'
            }
          }));

          queryClient.invalidateQueries({ queryKey: paymentKeys.all });

          toast.success(`Đối soát thành công giao dịch #${target.payOsOrderCode}`, {
            description: res.note || `Trạng thái đối soát: ${res.reconciliationStatus}`
          });
        },
        onError: (err) => {
          toast.error(`Đối soát giao dịch #${target.payOsOrderCode} thất bại`, {
            description: err instanceof Error ? err.message : 'Lỗi kết nối cổng thanh toán'
          });
        }
      });
    } else {
      toast.info('Giao dịch không có mã PayOS hợp lệ để đối soát trực tuyến.');
    }
  };

  // Batch reconcile all unreconciled transactions
  const handleBatchReconcile = () => {
    setIsReconcilingBatch(true);
    batchMutation.mutate(undefined, {
      onSuccess: (res) => {
        setIsReconcilingBatch(false);
        queryClient.invalidateQueries({ queryKey: paymentKeys.all });
        toast.success('Đối soát hàng loạt hoàn tất', {
          description: `Đã xử lý ${res.totalProcessed} giao dịch (${res.matchedCount} khớp, ${res.autoHealedCount} tự động đồng bộ).`
        });
      },
      onError: (err) => {
        setIsReconcilingBatch(false);
        toast.error('Đối soát hàng loạt không thành công', {
          description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại kết nối PayOS.'
        });
      }
    });
  };

  // Export CSV Audit Log
  const handleExport = () => {
    exportAuditLogToCsv(filteredTransactions);
  };

  // Compute live KPIs
  const effectiveKpis = useMemo(() => {
    return calculateLiveFinancialKpis(transactions, reconciliationSummary);
  }, [transactions, reconciliationSummary]);

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (selectedGateway !== 'all') {
        if (selectedGateway.toLowerCase().includes('payos') && !t.gateway.toLowerCase().includes('payos'))
          return false;
        if (selectedGateway.toLowerCase().includes('visa') && !t.gateway.toLowerCase().includes('visa'))
          return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesRef = t.bookingRef.toLowerCase().includes(query);
        const matchesCust = t.customerName.toLowerCase().includes(query);
        const matchesOrg = t.organizerLegalName.toLowerCase().includes(query);
        const matchesTrace = t.napasTraceNo.toLowerCase().includes(query);
        const matchesOrder = t.payOsOrderCode.toLowerCase().includes(query);
        if (!matchesId && !matchesRef && !matchesCust && !matchesOrg && !matchesTrace && !matchesOrder) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, statusFilter, selectedGateway, searchQuery]);

  const totalElements = paymentsPage?.totalElements ?? paymentsPage?.totalRecords ?? transactions.length;
  const totalPages = paymentsPage?.totalPages ?? Math.max(1, Math.ceil(totalElements / pageSize));

  return (
    <PageContainer>
      <div className='flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16'>
        {/* Page Header */}
        <header className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight'>
                Financial Reconciliation &amp; Payouts
              </h1>
              <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20'>
                A09
              </span>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Giám sát dòng tiền thanh toán qua cổng PayOS/VietQR, đối chiếu sao kê tài chính và giải ngân đối tác.
            </p>
          </div>

          <div className='flex items-center gap-2.5 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExport}
              className='gap-2 text-xs font-medium h-9'
            >
              <FileDown className='size-3.5' aria-hidden='true' />
              Export Audit Log (CSV)
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={handleBatchReconcile}
              disabled={isReconcilingBatch || batchMutation.isPending}
              className='gap-2 text-xs font-semibold h-9 shadow-xs'
            >
              {isReconcilingBatch || batchMutation.isPending ? (
                <>
                  <RefreshCw className='size-3.5 animate-spin' aria-hidden='true' />
                  Đang đối soát sao kê...
                </>
              ) : (
                <>
                  <CheckCircle2 className='size-3.5' aria-hidden='true' />
                  Run Batch Reconciliation
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Financial KPI Summary Cards */}
        <section aria-labelledby='financial-kpi-heading'>
          <h2 id='financial-kpi-heading' className='sr-only'>
            Tổng quan hiệu suất tài chính
          </h2>
          <FinancialKpiGrid kpis={effectiveKpis} />
        </section>

        {/* Filter Controls */}
        <section aria-labelledby='transactions-filter-heading'>
          <h2 id='transactions-filter-heading' className='sr-only'>
            Bộ lọc giao dịch tài chính
          </h2>
          <TransactionsFilterBar
            searchQuery={searchQuery}
            onSearchChange={(search) => updateFilters({ search, page: 1 })}
            statusFilter={statusFilter}
            onStatusChange={(status) => updateFilters({ status, page: 1 })}
            selectedGateway={selectedGateway}
            onGatewayChange={(gateway) => updateFilters({ gateway, page: 1 })}
            kpis={effectiveKpis}
            onReset={() => updateFilters({ search: '', status: 'all', gateway: 'all', page: 1 })}
          />
        </section>

        {/* Transactions Ledger Table */}
        <section aria-labelledby='transactions-ledger-heading'>
          <h2 id='transactions-ledger-heading' className='sr-only'>
            Sổ cái giao dịch và chi trả nền tảng
          </h2>
          <TransactionsLedgerTable
            items={filteredTransactions}
            selectedTransactionId={selectedTransaction?.id}
            onSelectTransaction={handleSelectTransaction}
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={(newPage) => updateFilters({ page: newPage })}
            isLoading={isPaymentsLoading || isPaymentsFetching}
          />
        </section>

        {/* Transaction & Settlement Details Drawer */}
        <TransactionDetailsDrawer
          transaction={selectedTransaction}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onReconcile={handleReconcileTransaction}
        />
      </div>
    </PageContainer>
  );
}
