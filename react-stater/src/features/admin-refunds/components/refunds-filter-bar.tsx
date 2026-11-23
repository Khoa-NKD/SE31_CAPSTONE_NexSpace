import React from 'react';
import { Search, X, RotateCcw, RefreshCw } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefundStatus } from '../data/mock-refunds';

interface RefundsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | RefundStatus;
  onStatusChange: (status: 'all' | RefundStatus) => void;
  counts: {
    all: number;
    pending: number;
    processed: number;
    rejected: number;
  };
  onReset?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  language?: 'vi' | 'en';
}

export function RefundsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  counts,
  onReset,
  onRefresh,
  isRefreshing = false,
  language = 'vi'
}: RefundsFilterBarProps) {
  const isVi = language === 'vi';
  const isFiltered = Boolean(searchQuery) || statusFilter !== 'all';

  const STATUS_TABS: Array<{
    id: 'all' | RefundStatus;
    labelVi: string;
    labelEn: string;
    count: number;
    dotColor?: string;
  }> = [
    { id: 'all', labelVi: 'Tất cả', labelEn: 'All', count: counts.all },
    {
      id: 'pending',
      labelVi: 'Chờ xét duyệt',
      labelEn: 'Pending Review',
      count: counts.pending,
      dotColor: 'bg-amber-500'
    },
    {
      id: 'processed',
      labelVi: 'Đã hoàn tiền',
      labelEn: 'Processed',
      count: counts.processed,
      dotColor: 'bg-emerald-500'
    },
    {
      id: 'rejected',
      labelVi: 'Đã từ chối',
      labelEn: 'Rejected',
      count: counts.rejected,
      dotColor: 'bg-rose-500'
    }
  ];

  return (
    <div className='min-w-0 space-y-3.5 mb-4'>
      {/* ── 1. Segmented Status Tabs ── */}
      <div className='flex flex-wrap items-center gap-1.5 rounded-xl border bg-card/60 p-1.5 shadow-2xs backdrop-blur-xs'>
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => onStatusChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {tab.dotColor && (
                <span
                  className={`size-1.5 rounded-full ${
                    isActive ? 'bg-primary-foreground' : tab.dotColor
                  }`}
                  aria-hidden='true'
                />
              )}
              <span>{isVi ? tab.labelVi : tab.labelEn}</span>
              <span className={`text-[11px] opacity-80 ${isActive ? 'font-bold' : ''}`}>
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 2. Compact Search & Action Controls Toolbar ── */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'>
        {/* Search Input */}
        <div className='relative w-full sm:max-w-xs md:max-w-sm'>
          <Search
            className='pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground/60'
            aria-hidden='true'
          />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            maxLength={255}
            placeholder={
              isVi
                ? 'Tìm theo mã yêu cầu, mã booking, khách hàng...'
                : 'Search claim ID, booking ref, customer...'
            }
            className='h-9 rounded-lg bg-card pl-8.5 pr-8 text-xs shadow-2xs transition-all focus-visible:ring-1'
          />
          {searchQuery && (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              className='absolute top-2.5 right-2.5 text-muted-foreground/60 hover:text-foreground'
              aria-label={isVi ? 'Xóa từ khóa' : 'Clear search'}
            >
              <X className='size-3.5' />
            </button>
          )}
        </div>

        {/* Action Controls & Total Count */}
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant='secondary'
            className='h-8 rounded-lg px-2.5 text-xs font-normal text-muted-foreground'
          >
            {isVi ? `${counts.all} yêu cầu` : `${counts.all} claims`}
          </Badge>

          {isFiltered && onReset && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={onReset}
            >
              <RotateCcw className='size-3.5' aria-hidden='true' />
              <span>{isVi ? 'Đặt lại' : 'Reset'}</span>
            </Button>
          )}

          {onRefresh && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isRefreshing}
              className='h-8 gap-1 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground'
              onClick={onRefresh}
              aria-label={isVi ? 'Làm mới' : 'Refresh'}
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden='true'
              />
              <span className='hidden sm:inline'>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
