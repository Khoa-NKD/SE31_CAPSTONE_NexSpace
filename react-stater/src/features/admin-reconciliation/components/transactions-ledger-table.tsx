import { formatDateLabel } from '@/lib/format';
import React from 'react';
import { Copy, CreditCard, ArrowUpRight } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TransactionRecord } from '../data/mock-transactions';

interface TransactionsLedgerTableProps {
  items: TransactionRecord[];
  selectedTransactionId?: string;
  onSelectTransaction: (item: TransactionRecord) => void;
  page?: number;
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  language?: 'vi' | 'en';
}

function getSettlementBadge(status: TransactionRecord['status'], language: 'vi' | 'en') {
  const isVi = language === 'vi';
  switch (status) {
    case 'settled':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
          {isVi ? 'Đã đối soát' : 'Settled & Matched'}
        </span>
      );
    case 'pending':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap'>
          <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' aria-hidden='true'></span>
          {isVi ? 'Chờ ký quỹ' : 'Pending Escrow'}
        </span>
      );
    case 'refunded':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap'>
          {isVi ? 'Đã hoàn tiền' : 'Refunded (100%)'}
        </span>
      );
    case 'failed':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 whitespace-nowrap'>
          <span className='w-1.5 h-1.5 rounded-full bg-rose-500' aria-hidden='true'></span>
          {isVi ? 'Lệch sao kê' : 'Mismatch / Failed'}
        </span>
      );
  }
}

function handleCopyId(e: React.MouseEvent, id: string, language: 'vi' | 'en') {
  e.stopPropagation();
  navigator.clipboard?.writeText(id);
  toast.success(
    language === 'vi' ? `Đã sao chép Mã GD #${id}` : `Transaction ID #${id} Copied to Clipboard`
  );
}

export function TransactionsLedgerTable({
  items,
  selectedTransactionId,
  onSelectTransaction,
  page = 1,
  totalPages = 1,
  totalElements,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  language = 'vi'
}: TransactionsLedgerTableProps) {
  const isVi = language === 'vi';

  // Client-side pagination if items.length > pageSize
  const pagedItems =
    totalElements !== undefined && totalElements > items.length
      ? items
      : items.slice((page - 1) * pageSize, page * pageSize);

  const calculatedTotalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const effectiveTotalPages = totalPages > 1 ? totalPages : calculatedTotalPages;
  const effectiveTotalElements = totalElements ?? items.length;

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, effectiveTotalElements);

  if (items.length === 0) {
    return (
      <div className='p-12 text-center bg-card rounded-xl border border-border shadow-2xs'>
        <CreditCard className='size-10 text-muted-foreground mx-auto mb-3 opacity-60' aria-hidden='true' />
        <h3 className='text-sm font-semibold text-foreground'>
          {isVi ? 'Không tìm thấy giao dịch tài chính phù hợp' : 'No transaction records match'}
        </h3>
        <p className='text-xs text-muted-foreground mt-1'>
          {isVi
            ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái và cổng thanh toán.'
            : 'Adjust your search terms or filter selections.'}
        </p>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs min-w-[950px]' aria-label='Platform financial transaction records ledger'>
          <thead>
            <tr className='border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground'>
              <th scope='col' className='px-3.5 py-3 w-[150px] min-w-[150px]'>
                {isVi ? 'Mã giao dịch' : 'Transaction ID'}
              </th>
              <th scope='col' className='px-3.5 py-3 w-[170px] min-w-[170px]'>
                {isVi ? 'Mã đặt chỗ (Booking)' : 'Booking Ref'}
              </th>
              <th scope='col' className='px-3.5 py-3 min-w-[140px]'>
                {isVi ? 'Cổng thanh toán' : 'Payment Gateway'}
              </th>
              <th scope='col' className='px-3.5 py-3 w-[130px] min-w-[130px] text-right'>
                {isVi ? 'Tổng tiền' : 'Total Amount'}
              </th>
              <th scope='col' className='px-3.5 py-3 w-[130px] min-w-[130px] text-right'>
                {isVi ? 'Phí sàn' : 'Platform Fee'}
              </th>
              <th scope='col' className='px-3.5 py-3 w-[140px] min-w-[140px]'>
                {isVi ? 'Trạng thái đối soát' : 'Settlement Status'}
              </th>
              <th scope='col' className='px-3.5 py-3 w-[130px] min-w-[130px]'>
                {isVi ? 'Thời gian' : 'Timestamp'}
              </th>
              <th
                scope='col'
                className='px-3.5 py-3 w-[110px] min-w-[110px] text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'
              >
                {isVi ? 'Thao tác' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {pagedItems.map((record) => {
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
                  <td className='px-3.5 py-2.5 font-mono'>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-bold text-foreground text-xs group-hover:text-primary transition-colors whitespace-nowrap'>
                        #{record.id}
                      </span>
                      <button
                        type='button'
                        onClick={(e) => handleCopyId(e, record.id, language)}
                        className='p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors'
                        title={isVi ? 'Sao chép mã giao dịch' : 'Copy Transaction ID'}
                        aria-label={`Copy Transaction ID #${record.id}`}
                      >
                        <Copy className='size-3' aria-hidden='true' />
                      </button>
                    </div>
                  </td>

                  {/* Booking Ref */}
                  <td className='px-3.5 py-2.5'>
                    <span className='font-mono font-semibold text-primary text-xs whitespace-nowrap'>
                      #{record.bookingRef}
                    </span>
                    <div className='text-[11px] text-muted-foreground truncate max-w-[160px]'>
                      {record.bookingSummary}
                    </div>
                  </td>

                  {/* Gateway */}
                  <td className='px-3.5 py-2.5'>
                    <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/70 text-foreground border border-border whitespace-nowrap'>
                      <CreditCard className='size-3 text-muted-foreground' aria-hidden='true' />
                      {record.gateway}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td className='px-3.5 py-2.5 font-mono text-right'>
                    <div className='font-bold text-foreground text-xs whitespace-nowrap tabular-nums'>
                      {Math.round(record.grossChargeVnd).toLocaleString('vi-VN')} đ
                    </div>
                    <div className='text-[10px] text-muted-foreground whitespace-nowrap'>
                      PayOS Checkout
                    </div>
                  </td>

                  {/* Platform Fee */}
                  <td className='px-3.5 py-2.5 font-mono text-right'>
                    <div className='font-semibold text-indigo-700 dark:text-indigo-400 text-xs whitespace-nowrap tabular-nums'>
                      -{Math.round(record.platformCommissionVnd).toLocaleString('vi-VN')} đ
                    </div>
                    <div className='text-[10px] text-muted-foreground whitespace-nowrap'>
                      {isVi ? `Phí sàn ${record.platformCommissionPercent}%` : `Fee ${record.platformCommissionPercent}%`}
                    </div>
                  </td>

                  {/* Settlement Status */}
                  <td className='px-3.5 py-2.5'>
                    {getSettlementBadge(record.status, language)}
                  </td>

                  {/* Timestamp */}
                  <td className='px-3.5 py-2.5 text-muted-foreground text-[11px]'>
                    <div className='whitespace-nowrap'>{formatDateLabel(record.timestamp)}</div>
                    <div className='text-[10px] text-muted-foreground/80 font-mono whitespace-nowrap'>
                      {record.relativeTime}
                    </div>
                  </td>

                  {/* Sticky Action Column */}
                  <td className='px-3.5 py-2.5 text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(record);
                      }}
                      className='h-7.5 px-2.5 text-xs gap-1 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all font-medium'
                      aria-label={`Inspect financial details for #${record.id}`}
                    >
                      <span>{isVi ? 'Chi tiết' : 'Inspect'}</span>
                      <ArrowUpRight className='size-3' aria-hidden='true' />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className='p-3 sm:p-3.5 border-t border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
        {/* Left summary & Page size select */}
        <div className='flex items-center gap-3'>
          <span>
            {isVi
              ? `Hiển thị ${startRecord} – ${endRecord} trên ${effectiveTotalElements.toLocaleString()} giao dịch`
              : `Showing ${startRecord} – ${endRecord} of ${effectiveTotalElements.toLocaleString()} transactions`}
            {isLoading && <span className='ml-2 text-primary animate-pulse'>({isVi ? 'Đang tải...' : 'Updating...'})</span>}
          </span>

          {onPageSizeChange && (
            <div className='flex items-center gap-1.5'>
              <span className='text-[11px] text-muted-foreground'>{isVi ? 'Dòng/trang:' : 'Rows:'}</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className='h-7 rounded border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-ring'
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>

        {/* Right Prev/Next & Page Numbers */}
        {effectiveTotalPages > 1 && (
          <div className='inline-flex items-center gap-1.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange?.(page - 1)}
              className='h-7.5 px-2.5 text-xs rounded-md'
            >
              {isVi ? 'Trước' : 'Previous'}
            </Button>
            {Array.from({ length: effectiveTotalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === effectiveTotalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className='px-1 text-muted-foreground'>...</span>
                  )}
                  <Button
                    type='button'
                    variant={p === page ? 'default' : 'outline'}
                    size='sm'
                    disabled={isLoading}
                    onClick={() => onPageChange?.(p)}
                    className={`h-7.5 min-w-[30px] px-2 text-xs rounded-md font-mono ${
                      p === page ? 'bg-primary text-primary-foreground font-bold shadow-2xs' : ''
                    }`}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={page >= effectiveTotalPages || isLoading}
              onClick={() => onPageChange?.(page + 1)}
              className='h-7.5 px-2.5 text-xs rounded-md'
            >
              {isVi ? 'Tiếp' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
