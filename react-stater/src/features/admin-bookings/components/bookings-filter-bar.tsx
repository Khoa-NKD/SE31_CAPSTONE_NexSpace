import React from 'react';
import { Search, RotateCcw, X } from '@/components/ui/hugeicons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookingStatus } from '../data/mock-bookings';
import type { BookingKpiData } from './booking-kpi-grid';

interface BookingsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: BookingStatus | 'all';
  onStatusChange: (status: BookingStatus | 'all') => void;
  kpis: BookingKpiData;
  onReset: () => void;
  language?: 'vi' | 'en';
}

export function BookingsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  kpis,
  onReset,
  language = 'vi'
}: BookingsFilterBarProps) {
  const isVi = language === 'vi';
  const isFiltered = searchQuery !== '' || statusFilter !== 'all';

  const filterTabs: Array<{
    key: BookingStatus | 'all';
    label: string;
    count: number;
  }> = [
    {
      key: 'all',
      label: isVi ? 'Tất cả' : 'All',
      count: kpis.totalCount
    },
    {
      key: 'confirmed',
      label: isVi ? 'Chờ nhận chỗ' : 'Confirmed',
      count: kpis.confirmedCount
    },
    {
      key: 'completed',
      label: isVi ? 'Đã hoàn tất' : 'Completed',
      count: kpis.completedCount
    },
    {
      key: 'cancelled',
      label: isVi ? 'Đã hủy' : 'Cancelled',
      count: kpis.cancelledCount
    }
  ];

  return (
    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 bg-card rounded-xl border border-border/70 shadow-2xs mb-5'>
      {/* Left: Search Input with Quick Clear Button */}
      <div className='relative flex-1 min-w-[260px] max-w-md'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none'
          aria-hidden='true'
        />
        <Input
          type='text'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isVi
              ? 'Tìm theo mã đơn (#NX-...), tên khách, không gian...'
              : 'Search by Booking ID (#NX-...), customer, workspace...'
          }
          className='pl-9 pr-8 h-9 text-xs sm:text-sm bg-background border-border/80 shadow-none focus-visible:ring-1'
          aria-label='Filter bookings by ID, customer name, or workspace'
        />
        {searchQuery && (
          <button
            type='button'
            onClick={() => onSearchChange('')}
            className='absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground'
            title={isVi ? 'Xóa từ khóa' : 'Clear search'}
            aria-label='Clear search'
          >
            <X className='size-3.5' />
          </button>
        )}
      </div>

      {/* Right: Segmented Status Pills + Reset Button */}
      <div className='flex flex-wrap items-center gap-2'>
        <div
          role='tablist'
          aria-label='Filter bookings by status'
          className='inline-flex p-0.5 bg-muted/60 rounded-lg border border-border/70 text-xs'
        >
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => onStatusChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'bg-muted-foreground/15 text-muted-foreground'
                  }`}
                >
                  {tab.count.toLocaleString('vi-VN')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reset button */}
        {isFiltered && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground'
          >
            <RotateCcw className='size-3 mr-1' aria-hidden='true' />
            <span>{isVi ? 'Đặt lại' : 'Reset'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
