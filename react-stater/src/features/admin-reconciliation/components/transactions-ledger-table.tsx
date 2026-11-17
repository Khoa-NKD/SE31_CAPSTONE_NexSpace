import React from 'react';
import { ChevronRight, Copy, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TransactionRecord } from '../data/mock-transactions';

interface TransactionsLedgerTableProps {
  items: TransactionRecord[];
  selectedTransactionId?: string;
  onSelectTransaction: (item: TransactionRecord) => void;
}

function getSettlementBadge(status: TransactionRecord['status']) {
  switch (status) {
    case 'settled':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
          Settled &amp; Matched
        </span>
      );
    case 'pending':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' aria-hidden='true'></span>
          Pending Escrow
        </span>
      );
    case 'refunded':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'>
          Refunded (100%)
        </span>
      );
    case 'failed':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'>
          Failed
        </span>
      );
  }
}

function handleCopyId(e: React.MouseEvent, id: string) {
  e.stopPropagation();
  navigator.clipboard?.writeText(id);
  toast.success(`Transaction ID #${id} Copied to Clipboard`);
}

export function TransactionsLedgerTable({
  items,
  selectedTransactionId,
  onSelectTransaction
}: TransactionsLedgerTableProps) {

  if (items.length === 0) {
    return (
      <div className='p-12 text-center bg-card rounded-xl border border-border shadow-2xs'>
        <CreditCard className='size-10 text-muted-foreground mx-auto mb-3 opacity-60' aria-hidden='true' />
        <h3 className='text-sm font-semibold text-foreground'>No transaction records match</h3>
        <p className='text-xs text-muted-foreground mt-1'>
          Adjust your search terms or filter selections.
        </p>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs' aria-label='Platform financial transaction records ledger'>
          <thead>
            <tr className='border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              <th scope='col' className='px-4 py-3.5'>Transaction ID</th>
              <th scope='col' className='px-4 py-3.5'>Booking Ref</th>
              <th scope='col' className='px-4 py-3.5'>Payment Gateway</th>
              <th scope='col' className='px-4 py-3.5'>Total Amount</th>
              <th scope='col' className='px-4 py-3.5'>Platform Fee</th>
              <th scope='col' className='px-4 py-3.5'>Settlement Status</th>
              <th scope='col' className='px-4 py-3.5'>Timestamp</th>
              <th scope='col' className='px-4 py-3.5 text-right'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {items.map((record) => {
              const isSelected = selectedTransactionId === record.id;

              return (
                <tr
                  key={record.id}
                  onClick={() => onSelectTransaction(record)}
                  className={`group cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  {/* Transaction ID */}
                  <td className='px-4 py-4'>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-mono font-bold text-foreground text-xs sm:text-sm group-hover:text-primary transition-colors'>
                        #{record.id}
                      </span>
                      <button
                        type='button'
                        onClick={(e) => handleCopyId(e, record.id)}
                        className='p-1 rounded text-muted-foreground hover:text-foreground transition-colors'
                        title='Copy Transaction ID'
                        aria-label={`Copy Transaction ID #${record.id}`}
                      >
                        <Copy className='size-3' aria-hidden='true' />
                      </button>
                    </div>
                  </td>

                  {/* Booking Ref */}
                  <td className='px-4 py-4'>
                    <span className='font-mono font-semibold text-primary'>
                      #{record.bookingRef}
                    </span>
                    <div className='text-[10px] text-muted-foreground truncate max-w-[150px]'>
                      {record.bookingSummary}
                    </div>
                  </td>

                  {/* Gateway */}
                  <td className='px-4 py-4'>
                    <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border'>
                      <CreditCard className='size-3 text-muted-foreground' aria-hidden='true' />
                      {record.gateway}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td className='px-4 py-4 font-mono'>
                    <div className='font-bold text-foreground'>
                      ${record.grossChargeUsd.toFixed(2)}
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      {record.grossChargeVnd.toLocaleString()} VND
                    </div>
                  </td>

                  {/* Platform Fee */}
                  <td className='px-4 py-4 font-mono'>
                    <div className='font-semibold text-indigo-700 dark:text-indigo-400'>
                      -${record.platformCommissionUsd.toFixed(2)}
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      {record.platformCommissionPercent}% ({record.platformCommissionVnd.toLocaleString()} VND)
                    </div>
                  </td>

                  {/* Settlement Status */}
                  <td className='px-4 py-4'>
                    {getSettlementBadge(record.status)}
                  </td>

                  {/* Timestamp */}
                  <td className='px-4 py-4 text-muted-foreground text-[11px]'>
                    <div>{record.timestamp}</div>
                    <div className='text-[10px] text-muted-foreground/80 font-mono'>{record.relativeTime}</div>
                  </td>

                  {/* Action */}
                  <td className='px-4 py-4 text-right'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(record);
                      }}
                      className='h-8 px-3 text-xs gap-1 hover:border-primary hover:text-primary'
                      aria-label={`Inspect financial details for #${record.id}`}
                    >
                      <span>Inspect</span>
                      <ChevronRight className='size-3.5' aria-hidden='true' />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className='p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div>
          Showing <strong className='text-foreground font-semibold'>{items.length}</strong> of{' '}
          <strong className='text-foreground font-semibold'>3,842</strong> transactions
        </div>
        <div className='inline-flex items-center gap-1.5'>
          <button
            type='button'
            disabled
            className='px-2.5 py-1 rounded border border-border bg-card text-muted-foreground opacity-50 cursor-not-allowed'
          >
            Previous
          </button>
          <span className='px-2.5 py-1 rounded bg-primary text-white font-semibold'>1</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            2
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            3
          </button>
          <span className='px-1 text-muted-foreground'>...</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            384
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
