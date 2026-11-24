import React from 'react';
import { Search, RotateCcw, X, RefreshCw } from '@/components/ui/hugeicons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TransactionStatus, FinancialSummaryKpis } from '../data/mock-transactions';

interface TransactionsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: TransactionStatus | 'all';
  onStatusChange: (status: TransactionStatus | 'all') => void;
  selectedGateway: string;
  onGatewayChange: (gateway: string) => void;
  kpis: FinancialSummaryKpis;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  language?: 'vi' | 'en';
}

export function TransactionsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedGateway,
  onGatewayChange,
  kpis,
  onReset,
  onRefresh,
  isRefreshing = false,
  language = 'vi'
}: TransactionsFilterBarProps) {
  const isVi = language === 'vi';
  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || selectedGateway !== 'all';

  const STATUS_TABS: Array<{
    id: TransactionStatus | 'all';
    labelVi: string;
    labelEn: string;
    count: number;
    dotColor?: string;
  }> = [
    {
      id: 'all',
      labelVi: 'Tất cả',
      labelEn: 'All',
      count: kpis.totalTransactionsCount
    },
    {
      id: 'settled',
      labelVi: 'Đã đối soát',
      labelEn: 'Settled',
      count: kpis.settledCount,
      dotColor: 'bg-emerald-500'
    },
    {
      id: 'pending',
      labelVi: 'Chờ ký quỹ',
      labelEn: 'Pending Escrow',
      count: kpis.pendingCount,
      dotColor: 'bg-amber-500 animate-pulse'
    },
    {
      id: 'refunded',
      labelVi: 'Đã hoàn tiền',
      labelEn: 'Refunded',
      count: kpis.refundedCount,
      dotColor: 'bg-indigo-500'
    }
  ];

  if (kpis.failedCount > 0) {
    STATUS_TABS.push({
      id: 'failed',
      labelVi: 'Lệch / Lỗi',
      labelEn: 'Failed',
      count: kpis.failedCount,
      dotColor: 'bg-rose-500'
    });
  }

  return (
    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 bg-card rounded-xl border border-border shadow-2xs mb-5'>
      {/* Left: Compact Search Input with Clear Button */}
      <div className='relative flex-1 min-w-[260px] max-w-md'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70 pointer-events-none'
          aria-hidden='true'
        />
        <Input
          type='text'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isVi
              ? 'Tìm theo Mã GD, Mã booking (#NX-...), Mã đơn...'
              : 'Search Transaction ID, Booking Ref (#NX-...), Order Code...'
          }
          className='pl-9 pr-8 h-9 text-xs bg-background border-border shadow-none focus-visible:ring-1'
          aria-label='Search transactions'
        />
        {searchQuery && (
          <button
            type='button'
            onClick={() => onSearchChange('')}
            className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5'
            aria-label={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
          >
            <X className='size-3.5' />
          </button>
        )}
      </div>

      {/* Right: Segmented Status Pills, Gateway Select & Actions */}
      <div className='flex flex-wrap items-center gap-2 sm:gap-2.5'>
        {/* Status Segmented Tabs */}
        <div
          role='tablist'
          aria-label='Filter transactions by settlement status'
          className='inline-flex p-1 bg-muted/60 rounded-lg border border-border/80'
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => onStatusChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.dotColor && (
                  <span className={`size-1.5 rounded-full ${tab.dotColor}`} aria-hidden='true' />
                )}
                <span>{isVi ? tab.labelVi : tab.labelEn}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gateway Select */}
        <select
          value={selectedGateway}
          onChange={(e) => onGatewayChange(e.target.value)}
          aria-label='Filter by Payment Gateway'
          className='h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring'
        >
          <option value='all'>{isVi ? 'Tất cả cổng thanh toán' : 'All Gateways'}</option>
          <option value='PayOS Banking QR'>PayOS Banking QR</option>
          <option value='Visa / MasterCard'>Visa / MasterCard</option>
        </select>

        {/* Reset Filter Button */}
        {isFiltered && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground gap-1'
          >
            <RotateCcw className='size-3.5' aria-hidden='true' />
            <span className='hidden sm:inline'>{isVi ? 'Đặt lại' : 'Reset'}</span>
          </Button>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isRefreshing}
            className='h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5'
            title={isVi ? 'Làm mới dữ liệu' : 'Refresh data'}
          >
            {isRefreshing ? (
              <Spinner className='size-3.5' aria-hidden='true' />
            ) : (
              <RefreshCw className='size-3.5' aria-hidden='true' />
            )}
            <span className='hidden sm:inline'>{isVi ? 'Làm mới' : 'Refresh'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
