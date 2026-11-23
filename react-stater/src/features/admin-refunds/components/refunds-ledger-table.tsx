import React, { useState } from 'react';
import { Copy, Check, ArrowUpRight } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { RefundRecord, formatVnd } from '../data/mock-refunds';

interface RefundsLedgerTableProps {
  refunds: RefundRecord[];
  selectedRefundId?: string;
  onSelectRefund: (refund: RefundRecord) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalRecords?: number;
  totalPages?: number;
  language?: 'vi' | 'en';
}

export function RefundsLedgerTable({
  refunds,
  selectedRefundId,
  onSelectRefund,
  page,
  onPageChange,
  pageSize,
  totalRecords,
  totalPages: propTotalPages,
  language = 'vi'
}: RefundsLedgerTableProps) {
  const isVi = language === 'vi';
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast.success(isVi ? `Đã sao chép ${text}` : `Copied ${text}`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const calculatedTotalPages = Math.max(1, Math.ceil(refunds.length / pageSize));
  const finalTotalPages = propTotalPages ?? calculatedTotalPages;
  const finalTotalRecords = totalRecords ?? refunds.length;

  // If using client-side slice:
  const pagedRefunds =
    propTotalPages != null
      ? refunds
      : refunds.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
      <Table className='min-w-[1100px]'>
        <TableHeader>
          <TableRow className='bg-muted/40 hover:bg-muted/40'>
            <TableHead className='w-[100px] text-xs font-semibold'>
              {isVi ? 'Mã hoàn' : 'Refund ID'}
            </TableHead>
            <TableHead className='w-[140px] text-xs font-semibold'>
              {isVi ? 'Mã booking' : 'Booking Ref'}
            </TableHead>
            <TableHead className='min-w-[200px] text-xs font-semibold'>
              {isVi ? 'Khách hàng' : 'Customer'}
            </TableHead>
            <TableHead className='min-w-[180px] text-xs font-semibold'>
              {isVi ? 'Không gian làm việc' : 'Workspace Hub'}
            </TableHead>
            <TableHead className='w-[120px] text-right text-xs font-semibold'>
              {isVi ? 'Số tiền gốc' : 'Original Paid'}
            </TableHead>
            <TableHead className='w-[130px] text-right text-xs font-semibold'>
              {isVi ? 'Tiền hoàn duyệt' : 'Calculated Refund'}
            </TableHead>
            <TableHead className='min-w-[180px] max-w-[240px] text-xs font-semibold'>
              {isVi ? 'Lý do yêu cầu' : 'Claim Reason'}
            </TableHead>
            <TableHead className='w-[130px] text-xs font-semibold'>
              {isVi ? 'Trạng thái' : 'Status'}
            </TableHead>
            <TableHead className='w-[130px] min-w-[130px] text-right text-xs font-semibold sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
              {isVi ? 'Thao tác' : 'Action'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedRefunds.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className='py-12 text-center text-xs text-muted-foreground'
              >
                {isVi
                  ? 'Không tìm thấy yêu cầu hoàn tiền nào phù hợp bộ lọc.'
                  : 'No refund claims match your filter criteria.'}
              </TableCell>
            </TableRow>
          ) : (
            pagedRefunds.map((refund) => {
              const isSelected = selectedRefundId === refund.id;

              return (
                <TableRow
                  key={refund.id}
                  onClick={() => onSelectRefund(refund)}
                  className={`cursor-pointer transition-colors hover:bg-muted/40 group ${
                    isSelected ? 'bg-primary/5 font-medium' : ''
                  }`}
                >
                  {/* Refund ID */}
                  <TableCell className='py-3 font-mono text-xs font-semibold text-foreground'>
                    <div className='flex items-center gap-1.5'>
                      {isSelected && (
                        <span className='size-1.5 rounded-full bg-primary shrink-0' />
                      )}
                      <span>{refund.id}</span>
                    </div>
                  </TableCell>

                  {/* Booking Ref */}
                  <TableCell className='py-3 font-mono text-xs font-medium text-foreground'>
                    <div className='flex items-center gap-1'>
                      <span className='text-primary hover:underline'>
                        {refund.bookingRef}
                      </span>
                      <button
                        type='button'
                        onClick={(e) => handleCopy(refund.bookingRef, e)}
                        className='rounded p-0.5 text-muted-foreground/60 hover:text-foreground'
                        title={isVi ? 'Sao chép mã đặt chỗ' : 'Copy Booking Reference'}
                        aria-label={`Copy booking reference ${refund.bookingRef}`}
                      >
                        {copiedRef === refund.bookingRef ? (
                          <Check className='size-3 text-emerald-500' />
                        ) : (
                          <Copy className='size-3' />
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell className='py-3'>
                    <div className='flex items-center gap-2.5'>
                      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary'>
                        {refund.avatarInitials}
                      </span>
                      <div className='min-w-0 max-w-[200px]'>
                        <span className='block truncate text-xs font-semibold text-foreground'>
                          {refund.customerName}
                        </span>
                        <span className='block truncate text-[11px] text-muted-foreground'>
                          {refund.customerEmail}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Workspace Hub */}
                  <TableCell className='py-3 text-xs'>
                    <div className='min-w-0 max-w-[200px]'>
                      <span className='block truncate font-medium text-foreground'>
                        {refund.workspaceHub}
                      </span>
                      <span className='block truncate text-[11px] text-muted-foreground'>
                        {refund.spaceDetails}
                      </span>
                    </div>
                  </TableCell>

                  {/* Original Paid */}
                  <TableCell className='py-3 text-right font-mono text-xs font-medium text-muted-foreground'>
                    {formatVnd(refund.originalPaidVnd)}
                  </TableCell>

                  {/* Calculated Refund */}
                  <TableCell className='py-3 text-right'>
                    <div className='inline-block rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary'>
                      {formatVnd(refund.calculatedRefundVnd)}
                    </div>
                    <div className='mt-0.5 text-[10px] text-muted-foreground'>
                      {refund.policyTierLabel}
                    </div>
                  </TableCell>

                  {/* Claim Reason */}
                  <TableCell
                    className='py-3 text-xs max-w-[220px]'
                    title={refund.claimReason}
                  >
                    <span className='line-clamp-2 text-foreground font-normal leading-snug'>
                      {refund.claimReason}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className='py-3'>
                    {refund.status === 'pending' && (
                      <Badge
                        variant='outline'
                        className='inline-flex items-center gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'
                      >
                        <span className='size-1.5 rounded-full bg-amber-500 animate-pulse' />
                        <span>{isVi ? 'Chờ duyệt' : 'Pending Review'}</span>
                      </Badge>
                    )}
                    {refund.status === 'processed' && (
                      <Badge
                        variant='outline'
                        className='inline-flex items-center gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'
                      >
                        <span className='size-1.5 rounded-full bg-emerald-500' />
                        <span>{isVi ? 'Đã chi PayOS' : 'Processed'}</span>
                      </Badge>
                    )}
                    {refund.status === 'rejected' && (
                      <Badge
                        variant='outline'
                        className='inline-flex items-center gap-1.5 rounded-full border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300'
                      >
                        <span className='size-1.5 rounded-full bg-rose-500' />
                        <span>{isVi ? 'Đã từ chối' : 'Rejected'}</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell className={`py-3 w-[130px] min-w-[130px] text-right sticky right-0 z-10 border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)] transition-colors ${
                    isSelected ? 'bg-primary/5 group-hover:bg-muted/50' : 'bg-card group-hover:bg-muted/50'
                  }`}>
                    {refund.status === 'pending' ? (
                      <Button
                        type='button'
                        size='sm'
                        className='h-7.5 gap-1 rounded-lg px-2.5 text-xs font-medium'
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRefund(refund);
                        }}
                      >
                        <span>{isVi ? 'Xét duyệt' : 'Review'}</span>
                        <ArrowUpRight className='size-3.5' />
                      </Button>
                    ) : (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground'
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRefund(refund);
                        }}
                      >
                        <span>{isVi ? 'Chi tiết' : 'Details'}</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination Footer */}
      {finalTotalPages > 1 && (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t bg-card/60 px-4 py-3 sm:px-6'>
          <span className='text-xs text-muted-foreground'>
            {isVi
              ? `Trang ${page} / ${finalTotalPages} (${finalTotalRecords} yêu cầu)`
              : `Page ${page} of ${finalTotalPages} (${finalTotalRecords} claims)`}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className='h-8 rounded-lg px-3 text-xs'
            >
              {isVi ? 'Trước' : 'Previous'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              disabled={page >= finalTotalPages}
              onClick={() => onPageChange(page + 1)}
              className='h-8 rounded-lg px-3 text-xs'
            >
              {isVi ? 'Tiếp' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
