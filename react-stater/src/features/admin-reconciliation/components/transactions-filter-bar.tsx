import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
}

export function TransactionsFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedGateway,
  onGatewayChange,
  kpis,
  onReset
}: TransactionsFilterBarProps) {
  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || selectedGateway !== 'all';

  return (
    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-2xs mb-6'>
      {/* Left: Search Input */}
      <div className='relative flex-1 min-w-[280px] max-w-lg'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none'
          aria-hidden='true'
        />
        <Input
          type='text'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Search Transaction ID, Booking Ref (#NX-...), Order Code...'
          className='pl-9 h-10 text-xs sm:text-sm bg-background border-border shadow-none'
          aria-label='Search transactions by ID, booking reference, or order code'
        />
      </div>

      {/* Right: Status Tabs and Gateway Dropdown */}
      <div className='flex flex-wrap items-center gap-3'>
        <div
          role='tablist'
          aria-label='Filter transactions by settlement status'
          className='inline-flex p-1 bg-muted/60 rounded-lg border border-border'
        >
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'all'}
            onClick={() => onStatusChange('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({kpis.totalTransactionsCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'settled'}
            onClick={() => onStatusChange('settled')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'settled'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Settled ({kpis.settledCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'pending'}
            onClick={() => onStatusChange('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Escrow ({kpis.pendingCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={statusFilter === 'refunded'}
            onClick={() => onStatusChange('refunded')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === 'refunded'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Refunded ({kpis.refundedCount})
          </button>
        </div>

        {/* Gateway Select */}
        <select
          value={selectedGateway}
          onChange={(e) => onGatewayChange(e.target.value)}
          aria-label='Filter by Payment Gateway'
          className='h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring'
        >
          <option value='all'>All Gateways</option>
          <option value='PayOS Banking QR'>PayOS Banking QR</option>
          <option value='Visa / MasterCard'>Visa / MasterCard</option>
        </select>

        {/* Reset button */}
        {isFiltered && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <RotateCcw className='size-3.5 mr-1.5' aria-hidden='true' />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
