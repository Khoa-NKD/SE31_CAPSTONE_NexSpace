import React from 'react';
import { Copy, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { RefundRecord } from '../data/mock-refunds';

interface RefundsLedgerTableProps {
  refunds: RefundRecord[];
  selectedRefundId?: string;
  onSelectRefund: (refund: RefundRecord) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
}

export function RefundsLedgerTable({
  refunds,
  selectedRefundId,
  onSelectRefund,
  page,
  onPageChange,
  pageSize
}: RefundsLedgerTableProps) {
  const [copiedRef, setCopiedRef] = React.useState<string | null>(null);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast.success(`Copied ${text} to clipboard`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const totalPages = Math.max(1, Math.ceil(refunds.length / pageSize));
  const pagedRefunds = refunds.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className='bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse' aria-label='Refund requests and claims ledger table'>
          <thead>
            <tr className='bg-muted/60 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              <th scope='col' className='py-3 px-4'>Refund ID</th>
              <th scope='col' className='py-3 px-3'>Booking Ref</th>
              <th scope='col' className='py-3 px-3'>Customer</th>
              <th scope='col' className='py-3 px-3'>Workspace Hub</th>
              <th scope='col' className='py-3 px-3 text-right'>Original Paid</th>
              <th scope='col' className='py-3 px-3 text-right'>Calculated Refund</th>
              <th scope='col' className='py-3 px-4'>Claim Reason</th>
              <th scope='col' className='py-3 px-3'>Status</th>
              <th scope='col' className='py-3 px-4 text-center'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border text-xs'>
            {pagedRefunds.length === 0 ? (
              <tr>
                <td colSpan={9} className='py-8 text-center text-muted-foreground'>
                  No refund claims match your filter criteria.
                </td>
              </tr>
            ) : (
              pagedRefunds.map((refund) => {
                const isSelected = selectedRefundId === refund.id;

                return (
                  <tr
                    key={refund.id}
                    onClick={() => onSelectRefund(refund)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Refund ID */}
                    <td className='py-3.5 px-4 font-mono font-bold text-foreground'>
                      <div className='flex items-center gap-1.5'>
                        {isSelected && (
                          <span className='size-1.5 rounded-full bg-primary shrink-0' />
                        )}
                        <span>{refund.id}</span>
                      </div>
                    </td>

                    {/* Booking Ref */}
                    <td className='py-3.5 px-3 font-mono font-medium text-foreground'>
                      <div className='flex items-center gap-1'>
                        <span className='text-primary hover:underline'>{refund.bookingRef}</span>
                        <button
                          type='button'
                          onClick={(e) => handleCopy(refund.bookingRef, e)}
                          aria-label={`Copy booking reference ${refund.bookingRef}`}
                          className='text-muted-foreground hover:text-foreground p-0.5 rounded'
                          title='Copy Booking Reference'
                        >
                          {copiedRef === refund.bookingRef ? (
                            <Check className='size-3 text-emerald-500' />
                          ) : (
                            <Copy className='size-3' />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className='py-3.5 px-3' aria-label={refund.customerName}>
                      <div className='flex items-center gap-2'>
                        <div className='size-6 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0'>
                          {refund.avatarInitials}
                        </div>
                        <div className='min-w-0'>
                          <div className='font-semibold text-foreground truncate'>
                            {refund.customerName}
                          </div>
                          <div className='text-[10px] text-muted-foreground truncate'>
                            {refund.customerEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Workspace Hub */}
                    <td className='py-3.5 px-3 text-foreground'>
                      <div className='font-medium'>{refund.workspaceHub}</div>
                      <div className='text-[10px] text-muted-foreground'>{refund.spaceDetails}</div>
                    </td>

                    {/* Original Paid */}
                    <td className='py-3.5 px-3 text-right font-medium text-foreground'>
                      <div>${refund.originalPaidUsd.toFixed(2)}</div>
                      <div className='text-[10px] text-muted-foreground'>
                        {(refund.originalPaidVnd / 1000).toLocaleString()}k VND
                      </div>
                    </td>

                    {/* Calculated Refund */}
                    <td className='py-3.5 px-3 text-right'>
                      <div className='inline-block bg-primary/10 border border-primary/30 text-primary font-bold px-2 py-0.5 rounded text-xs'>
                        ${refund.calculatedRefundUsd.toFixed(2)}
                      </div>
                      <div className='text-[10px] text-muted-foreground mt-0.5'>
                        {refund.policyTierLabel}
                      </div>
                    </td>

                    {/* Claim Reason */}
                    <td
                      className='py-3.5 px-4 max-w-[200px] truncate text-foreground font-medium'
                      title={refund.claimReason}
                    >
                      {refund.claimReason}
                    </td>

                    {/* Status */}
                    <td className='py-3.5 px-3'>
                      {refund.status === 'pending' && (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'>
                          <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                          Pending Review
                        </span>
                      )}
                      {refund.status === 'processed' && (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'>
                          <span className='size-1.5 rounded-full bg-emerald-500' />
                          Processed
                        </span>
                      )}
                      {refund.status === 'rejected' && (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40'>
                          <span className='size-1.5 rounded-full bg-red-500' />
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className='py-3.5 px-4 text-center'>
                      {refund.status === 'pending' ? (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRefund(refund);
                          }}
                          className='inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground font-semibold text-[11px] rounded hover:bg-primary/90 transition-colors shadow-xs'
                        >
                          <span>Review Claim</span>
                          <ChevronRight className='size-3.5' />
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRefund(refund);
                          }}
                          className='text-muted-foreground hover:text-foreground text-xs font-medium px-2 py-1 rounded hover:bg-muted transition-colors'
                        >
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className='p-3 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground'>
        <div>
          Showing <span className='font-semibold text-foreground'>{refunds.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> -{' '}
          <span className='font-semibold text-foreground'>
            {Math.min(page * pageSize, refunds.length)}
          </span>{' '}
          of <span className='font-semibold text-foreground'>{refunds.length}</span> claims
        </div>

        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className='px-2.5 py-1 rounded border border-input bg-background hover:bg-muted disabled:opacity-50 transition-colors'
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type='button'
              onClick={() => onPageChange(p)}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                p === page
                  ? 'border-primary bg-primary text-primary-foreground font-bold'
                  : 'border-input bg-background hover:bg-muted text-foreground'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type='button'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className='px-2.5 py-1 rounded border border-input bg-background hover:bg-muted disabled:opacity-50 transition-colors'
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
