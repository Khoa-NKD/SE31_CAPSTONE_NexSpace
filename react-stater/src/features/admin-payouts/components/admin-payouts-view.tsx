import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminPayoutQueries, adminPayoutKeys } from '../api/queries';
import { PendingRequestsTable } from './pending-requests-table';
import { GlobalPayoutLedgerTable } from './global-payout-ledger-table';
import { PayoutKpiGrid, PayoutKpiStats } from './payout-kpi-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, FileText, RefreshCw, FileDown } from '@/components/ui/hugeicons';
import { useLanguage } from '@/features/landing/context/language-context';
import { toast } from 'sonner';
import { INITIAL_PAYOUT_BATCHES } from '../data/mock-payouts';

export const AdminPayoutsView: React.FC = () => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: requests, isLoading: isRequestsLoading, isFetching: isRequestsFetching, refetch: refetchRequests } = useQuery(
    adminPayoutQueries.requests(1, 20)
  );

  const { data: ledger, isLoading: isLedgerLoading, isFetching: isLedgerFetching, refetch: refetchLedger } = useQuery(
    adminPayoutQueries.ledger({
      page,
      size: pageSize,
      status: statusFilter,
      payoutType: typeFilter
    })
  );

  const pendingCount = requests?.totalRecords ?? requests?.listObjects?.length ?? 0;

  // Smart default: If there are pending requests needing attention, start on 'requests', otherwise on 'ledger'
  const [activeTab, setActiveTab] = useState<'requests' | 'ledger'>(() =>
    pendingCount > 0 ? 'requests' : 'ledger'
  );

  // Compute live KPI stats from ledger and requests
  const stats: PayoutKpiStats = useMemo(() => {
    const rawBatches = ledger?.listObjects || ledger?.content;
    const batches = (rawBatches && rawBatches.length > 0) ? rawBatches : INITIAL_PAYOUT_BATCHES;

    const paidBatches = batches.filter((b) => b.status === 'PAID');
    const totalDisbursed = paidBatches.reduce((acc, b) => acc + (b.amount || 0), 0);
    const failedBatches = batches.filter((b) => b.status === 'FAILED');

    return {
      totalDisbursedVnd: totalDisbursed,
      paidCount: paidBatches.length,
      pendingRequestsCount: pendingCount,
      failedCount: failedBatches.length
    };
  }, [ledger, pendingCount]);

  const handleRefresh = () => {
    void refetchRequests();
    void refetchLedger();
    void queryClient.invalidateQueries({ queryKey: adminPayoutKeys.all });
    toast.success(isVi ? 'Đã làm mới dữ liệu Payout' : 'Payout data refreshed');
  };

  const handleExportCsv = () => {
    const rawBatches = ledger?.listObjects || ledger?.content;
    const batches = (rawBatches && rawBatches.length > 0) ? rawBatches : INITIAL_PAYOUT_BATCHES;

    const headers = [
      'Mã đợt rút',
      'Mã đối tác',
      'Tên đối tác',
      'Loại hình',
      'Số tiền (VNĐ)',
      'Ngân hàng',
      'Số tài khoản',
      'Chủ tài khoản',
      'Mã PayOS Ref',
      'Trạng thái',
      'Thời gian'
    ];

    const rows = batches.map((b) => [
      `"${b.batchCode}"`,
      `"${b.organizerId || ''}"`,
      `"${(b.organizerName || '').replace(/"/g, '""')}"`,
      `"${b.payoutType}"`,
      b.amount,
      `"${b.bankName || ''}"`,
      `"${b.bankAccountNumber || ''}"`,
      `"${(b.bankAccountHolder || '').replace(/"/g, '""')}"`,
      `"${b.payosReference || ''}"`,
      `"${b.status}"`,
      `"${b.createdAt}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `so-cai-chi-tien-payout-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isVi ? 'Đã tải xuống file CSV sổ cái chi tiền' : 'Exported payout ledger to CSV');
  };

  const isRefreshing = isRequestsFetching || isLedgerFetching;

  return (
    <div className='space-y-5 pb-16 max-w-7xl mx-auto w-full'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4'>
        <div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground mb-1'>
            <Link to='/dashboard/overview' className='hover:text-foreground flex items-center gap-1 transition-colors'>
              <ArrowLeft className='size-3' /> {isVi ? 'Quản trị Admin' : 'Admin Console'}
            </Link>
            <span>/</span>
            <span>{isVi ? 'Tài chính & Chi trả' : 'Finance & Payouts'}</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <h1 className='text-xl sm:text-2xl font-bold text-foreground font-heading tracking-tight'>
              {isVi ? 'Quản lý Chi trả & Sổ cái Payout' : 'Payout Management & Global Ledger'}
            </h1>
            <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20'>
              A10
            </span>
          </div>
          <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
            {isVi
              ? 'Phê duyệt các yêu cầu cấu hình Auto Payout của Organizer và giám sát toàn bộ các lệnh chi tiền qua cổng PayOS.'
              : 'Review Organizer Auto Payout configuration requests and monitor all disbursement records via PayOS.'}
          </p>
        </div>

        {/* Action Button Bar */}
        <div className='flex items-center gap-2 shrink-0 self-start sm:self-auto'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isRefreshing}
            className='h-8.5 px-2.5 text-xs gap-1.5'
            title={isVi ? 'Làm mới dữ liệu' : 'Refresh data'}
          >
            {isRefreshing ? (
              <Spinner className='size-3.5' aria-hidden='true' />
            ) : (
              <RefreshCw className='size-3.5' aria-hidden='true' />
            )}
            <span className='hidden sm:inline'>{isVi ? 'Làm mới' : 'Refresh'}</span>
          </Button>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleExportCsv}
            className='h-8.5 px-2.5 text-xs gap-1.5'
            title={isVi ? 'Xuất danh sách ra CSV' : 'Export to CSV'}
          >
            <FileDown className='size-3.5' aria-hidden='true' />
            <span>{isVi ? 'Xuất CSV' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* 4 Sleek Bento KPI Cards */}
      <PayoutKpiGrid stats={stats} language={language} />

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'requests' | 'ledger')}>
        <div className='flex items-center justify-between gap-3'>
          <TabsList className='grid w-full sm:w-auto grid-cols-2 bg-muted/60 p-1 rounded-xl border border-border/80'>
            <TabsTrigger value='ledger' className='text-xs font-semibold gap-1.5 rounded-lg px-3.5 py-1.5 transition-all'>
              <FileText className='size-3.5' />
              <span>{isVi ? 'Sổ cái Chi tiền Toàn sàn' : 'Disbursement Ledger'}</span>
            </TabsTrigger>
            <TabsTrigger value='requests' className='text-xs font-semibold gap-1.5 rounded-lg px-3.5 py-1.5 transition-all'>
              <Clock className='size-3.5' />
              <span>{isVi ? 'Yêu cầu Auto Payout' : 'Auto Payout Requests'}</span>
              {pendingCount > 0 ? (
                <span className='ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse'>
                  {pendingCount}
                </span>
              ) : (
                <span className='ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-mono'>
                  0
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Global Payout Ledger */}
        <TabsContent value='ledger' className='pt-3.5'>
          <GlobalPayoutLedgerTable
            ledger={ledger}
            isLoading={isLedgerLoading}
            statusFilter={statusFilter}
            onStatusChange={(status) => {
              setStatusFilter(status);
              setPage(1);
            }}
            typeFilter={typeFilter}
            onTypeChange={(type) => {
              setTypeFilter(type);
              setPage(1);
            }}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </TabsContent>

        {/* Tab 2: Pending Auto Payout Requests */}
        <TabsContent value='requests' className='pt-3.5'>
          <PendingRequestsTable requests={requests} isLoading={isRequestsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
