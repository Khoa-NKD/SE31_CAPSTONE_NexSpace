import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_TRANSACTIONS,
  MOCK_FINANCIAL_KPIS,
  TransactionRecord,
  TransactionStatus
} from '@/features/admin-reconciliation/data/mock-transactions';
import { FinancialKpiGrid } from '@/features/admin-reconciliation/components/financial-kpi-grid';
import { TransactionsFilterBar } from '@/features/admin-reconciliation/components/transactions-filter-bar';
import { TransactionsLedgerTable } from '@/features/admin-reconciliation/components/transactions-ledger-table';
import { TransactionDetailsDrawer } from '@/features/admin-reconciliation/components/transaction-details-drawer';

const reconciliationSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'settled', 'pending', 'failed', 'refunded']).optional().default('all'),
  gateway: z.string().optional().default('all'),
  txId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/reconciliation')({
  head: () => ({
    meta: [
      { title: 'A09 — Financial Reconciliation & Payouts | NexSpace Console' },
      {
        name: 'description',
        content: 'Audit platform gross volume, PayOS instant escrow settlements, gateway interchange fees, and organizer disbursements.'
      }
    ]
  }),
  validateSearch: zodValidator(reconciliationSearchSchema),
  component: FinancialReconciliationPage
});

function handleExportAuditLog() {
  toast.success('Reconciliation Audit Ledger Exported (CSV)', {
    description: 'Exported 3,842 transaction and disbursement records with Napas247 trace numbers.'
  });
}

function FinancialReconciliationPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(() => {
    if (searchParams.txId) {
      return INITIAL_TRANSACTIONS.find((t) => t.id === searchParams.txId) || null;
    }
    return null;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => Boolean(searchParams.txId));
  const [isReconcilingBatch, setIsReconcilingBatch] = useState(false);

  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as TransactionStatus | 'all') || 'all';
  const selectedGateway = searchParams.gateway || 'all';

  // Handle URL updates cleanly
  const updateFilters = (updates: Partial<{ search: string; status: TransactionStatus | 'all'; gateway: string; txId?: string }>) => {
    navigate({
      search: (prev) => {
        const next: Record<string, string | undefined> = { ...prev, ...updates };
        if (!next.search) delete next.search;
        if (next.status === 'all') delete next.status;
        if (next.gateway === 'all') delete next.gateway;
        if (!next.txId) delete next.txId;
        return next as typeof prev;
      },
      replace: true
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

  const handleReconcileTransaction = (target: TransactionRecord) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === target.id
          ? {
              ...t,
              status: 'settled',
              reconciled: true,
              statusBadge: 'Settled & Matched 100%'
            }
          : t
      )
    );
    if (selectedTransaction?.id === target.id) {
      setSelectedTransaction({
        ...target,
        status: 'settled',
        reconciled: true,
        statusBadge: 'Settled & Matched 100%'
      });
    }
    toast.success(`Transaction #${target.id} Manually Reconciled`, {
      description: `Disbursement cleared for ${target.organizerLegalName}. Bank trace verified.`
    });
  };

  const handleBatchReconcile = () => {
    setIsReconcilingBatch(true);
    setTimeout(() => {
      setTransactions((prev) =>
        prev.map((t) => (t.status === 'pending' ? { ...t, status: 'settled', reconciled: true } : t))
      );
      setIsReconcilingBatch(false);
      toast.success('Batch Reconciliation Succeeded', {
        description: 'All 38 pending escrow payments matched against State Bank of Vietnam / PayOS bank feeds.'
      });
    }, 800);
  };

  // Filter items deterministically
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (selectedGateway !== 'all') {
        if (selectedGateway === 'payos' && !t.gateway.toLowerCase().includes('payos')) return false;
        if (selectedGateway === 'napas' && !t.gateway.toLowerCase().includes('napas')) return false;
        if (selectedGateway === 'card' && !t.gateway.toLowerCase().includes('visa')) return false;
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
              Real-time audit log of booking transactions, automated PayOS escrow disbursements, and platform take-rate margins.
            </p>
          </div>

          <div className='flex items-center gap-2.5 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportAuditLog}
              className='gap-2 text-xs font-medium h-9'
            >
              <FileDown className='size-3.5' aria-hidden='true' />
              Export Audit Log
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={handleBatchReconcile}
              disabled={isReconcilingBatch}
              className='gap-2 text-xs font-semibold h-9 shadow-sm'
            >
              {isReconcilingBatch ? (
                <>
                  <RefreshCw className='size-3.5 animate-spin' aria-hidden='true' />
                  Reconciling Feeds...
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
            Financial Performance Overview
          </h2>
          <FinancialKpiGrid kpis={MOCK_FINANCIAL_KPIS} />
        </section>

        {/* Filter Controls */}
        <section aria-labelledby='transactions-filter-heading'>
          <h2 id='transactions-filter-heading' className='sr-only'>
            Filter Financial Transactions
          </h2>
          <TransactionsFilterBar
            searchQuery={searchQuery}
            onSearchChange={(search) => updateFilters({ search })}
            statusFilter={statusFilter}
            onStatusChange={(status) => updateFilters({ status })}
            selectedGateway={selectedGateway}
            onGatewayChange={(gateway) => updateFilters({ gateway })}
            kpis={MOCK_FINANCIAL_KPIS}
            onReset={() => updateFilters({ search: '', status: 'all', gateway: 'all' })}
          />
        </section>

        {/* Transactions Ledger Table */}
        <section aria-labelledby='transactions-ledger-heading'>
          <h2 id='transactions-ledger-heading' className='sr-only'>
            Platform Transactions and Disbursements
          </h2>
          <TransactionsLedgerTable
            items={filteredTransactions}
            selectedTransactionId={selectedTransaction?.id}
            onSelectTransaction={handleSelectTransaction}
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
