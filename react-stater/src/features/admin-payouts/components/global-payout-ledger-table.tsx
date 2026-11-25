import { Spinner } from '@/components/ui/spinner';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  Building2,
  Inbox,
  Search,
  X
} from '@/components/ui/hugeicons';
import type { OrganizerWithdrawalBatch, PageResponse } from '../api/types';
import { useRetryWithdrawalMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';
import { INITIAL_PAYOUT_BATCHES } from '../data/mock-payouts';

interface GlobalPayoutLedgerTableProps {
  ledger?: PageResponse<OrganizerWithdrawalBatch>;
  isLoading: boolean;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  typeFilter?: string;
  onTypeChange?: (type: string) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const GlobalPayoutLedgerTable: React.FC<GlobalPayoutLedgerTableProps> = ({
  ledger,
  isLoading,
  statusFilter = 'all',
  onStatusChange,
  typeFilter = 'all',
  onTypeChange,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const retryMutation = useRetryWithdrawalMutation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback to initial mock batches if DB is empty
  const rawItems = ledger?.listObjects || ledger?.content;
  const items = (rawItems && rawItems.length > 0) ? rawItems : INITIAL_PAYOUT_BATCHES;

  // Filter items by search, status, and type
  const query = searchQuery.toLowerCase().trim();
  const filteredItems = items.filter((batch) => {
    if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
    if (typeFilter !== 'all' && batch.payoutType !== typeFilter) return false;
    if (query) {
      const matchCode = batch.batchCode.toLowerCase().includes(query);
      const matchOrg = (batch.organizerName || '').toLowerCase().includes(query);
      const matchBank = (batch.bankName || '').toLowerCase().includes(query);
      const matchHolder = (batch.bankAccountHolder || '').toLowerCase().includes(query);
      const matchRef = (batch.payosReference || '').toLowerCase().includes(query);
      if (!matchCode && !matchOrg && !matchBank && !matchHolder && !matchRef) {
        return false;
      }
    }
    return true;
  });

  const totalElements = ledger?.totalRecords ?? filteredItems.length;
  const calculatedTotalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const effectiveTotalPages = ledger?.totalPages ?? calculatedTotalPages;

  const pagedItems =
    ledger?.totalPages !== undefined
      ? filteredItems
      : filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalElements);

  return (
    <Card className='border-border shadow-2xs overflow-hidden bg-card rounded-xl'>
      <CardHeader className='bg-muted/30 border-b border-border/70 p-4 sm:p-5'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
          <div>
            <CardTitle className='text-base font-bold text-foreground'>
              {isVi ? 'Sổ cái Chi tiền Payout Toàn Hệ thống' : 'Platform Disbursement Ledger'}
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground mt-0.5'>
              {isVi
                ? 'Theo dõi mọi giao dịch rút tiền thủ công và tự động qua PayOS. Cho phép thử lại nếu cổng thanh toán báo lỗi.'
                : 'Track all manual and automated withdrawal transactions via PayOS. Retry failed transactions if needed.'}
            </CardDescription>
          </div>

          {/* Search & Filter Toolbar */}
          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Search Input */}
            <div className='relative w-full sm:w-64'>
              <Search
                className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none'
                aria-hidden='true'
              />
              <Input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm mã đợt, đối tác, ngân hàng...' : 'Search batch, partner, bank...'}
                className='h-8.5 pl-8 pr-7 text-xs bg-background'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5'
                  aria-label={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <X className='size-3' />
                </button>
              )}
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className='h-8.5 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground'
              aria-label='Filter by status'
            >
              <option value='all'>{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value='PAID'>{isVi ? 'Thành công (PAID)' : 'Paid (Success)'}</option>
              <option value='PROCESSING'>{isVi ? 'Đang xử lý (PROCESSING)' : 'Processing'}</option>
              <option value='FAILED'>{isVi ? 'Thất bại (FAILED)' : 'Failed'}</option>
            </select>

            {/* Type Select */}
            <select
              value={typeFilter}
              onChange={(e) => onTypeChange?.(e.target.value)}
              className='h-8.5 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground'
              aria-label='Filter by payout type'
            >
              <option value='all'>{isVi ? 'Tất cả loại hình' : 'All Types'}</option>
              <option value='AUTO_DAILY'>{isVi ? 'Tự động (Auto Daily)' : 'Auto Daily'}</option>
              <option value='MANUAL'>{isVi ? 'Rút tay (Manual)' : 'Manual'}</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {isLoading ? (
          <div className='p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2'>
            <Spinner className='size-4' />
            <span>{isVi ? 'Đang tải sổ cái chi tiền...' : 'Loading payout ledger...'}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='p-12 text-center space-y-2'>
            <Inbox className='size-8 text-muted-foreground/40 mx-auto' />
            <div className='text-sm font-medium text-foreground'>
              {isVi ? 'Chưa có giao dịch chi tiền nào phù hợp' : 'No payout transactions recorded'}
            </div>
            <p className='text-xs text-muted-foreground'>
              {isVi ? 'Thử thay đổi điều kiện tìm kiếm hoặc bộ lọc trạng thái.' : 'Try adjusting your search criteria or active filters.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='text-xs min-w-[950px]'>
              <TableHeader>
                <TableRow className='text-xs font-semibold text-muted-foreground bg-muted/40 border-border'>
                  <TableHead className='w-[140px] px-3.5 py-3'>{isVi ? 'Mã đợt rút' : 'Batch Code'}</TableHead>
                  <TableHead className='min-w-[200px] px-3.5 py-3'>{isVi ? 'Đối tác (Organizer)' : 'Organizer'}</TableHead>
                  <TableHead className='w-[110px] px-3.5 py-3'>{isVi ? 'Loại hình' : 'Type'}</TableHead>
                  <TableHead className='w-[130px] px-3.5 py-3 text-right'>{isVi ? 'Số tiền' : 'Amount'}</TableHead>
                  <TableHead className='min-w-[180px] px-3.5 py-3'>{isVi ? 'Tài khoản nhận' : 'Bank Account'}</TableHead>
                  <TableHead className='w-[140px] px-3.5 py-3'>{isVi ? 'Mã PayOS Ref' : 'PayOS Ref'}</TableHead>
                  <TableHead className='w-[130px] px-3.5 py-3'>{isVi ? 'Trạng thái' : 'Status'}</TableHead>
                  <TableHead className='w-[120px] px-3.5 py-3'>{isVi ? 'Thời gian' : 'Timestamp'}</TableHead>
                  <TableHead className='w-[100px] min-w-[100px] px-3.5 py-3 text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                    {isVi ? 'Thao tác' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border'>
                {pagedItems.map((batch) => {
                  const isAuto = batch.payoutType === 'AUTO_DAILY';
                  const isPaid = batch.status === 'PAID';
                  const isProcessing = batch.status === 'PROCESSING';
                  const isFailed = batch.status === 'FAILED';

                  return (
                    <TableRow key={batch.id} className='border-border hover:bg-muted/40 transition-colors group'>
                      {/* Batch Code */}
                      <TableCell className='px-3.5 py-2.5 font-mono font-bold text-foreground text-xs whitespace-nowrap'>
                        #{batch.batchCode}
                      </TableCell>

                      {/* Organizer */}
                      <TableCell className='px-3.5 py-2.5'>
                        <div className='font-semibold text-foreground truncate max-w-[220px]'>
                          {batch.organizerName || `ID #${batch.organizerId}`}
                        </div>
                      </TableCell>

                      {/* Payout Type */}
                      <TableCell className='px-3.5 py-2.5'>
                        {isAuto ? (
                          <Badge className='bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                            <Sparkles className='size-2.5' /> Auto Daily
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='text-muted-foreground text-[10px] font-semibold gap-1 border-border whitespace-nowrap'>
                            <ArrowDownLeft className='size-2.5 text-muted-foreground' /> Manual
                          </Badge>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className='px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums text-xs'>
                        {Math.round(batch.amount).toLocaleString('vi-VN')} đ
                      </TableCell>

                      {/* Bank Account */}
                      <TableCell className='px-3.5 py-2.5'>
                        <div className='flex items-center gap-1.5 text-foreground whitespace-nowrap'>
                          <Building2 className='size-3 text-muted-foreground shrink-0' />
                          <span className='font-medium'>{batch.bankName}</span>
                          <span className='font-mono text-muted-foreground text-[11px]'>
                            •••• {batch.bankAccountNumber ? batch.bankAccountNumber.slice(-4) : ''}
                          </span>
                        </div>
                        <div className='text-[10px] text-muted-foreground uppercase truncate max-w-[180px]'>
                          {batch.bankAccountHolder}
                        </div>
                      </TableCell>

                      {/* PayOS Reference */}
                      <TableCell className='px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground'>
                        {batch.payosReference ? (
                          <span className='whitespace-nowrap'>{batch.payosReference}</span>
                        ) : batch.errorReason ? (
                          <span className='text-rose-500 truncate max-w-[130px] block' title={batch.errorReason}>
                            {batch.errorReason}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className='px-3.5 py-2.5'>
                        {isPaid && (
                          <Badge className='bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                            <CheckCircle2 className='size-2.5' /> {isVi ? 'Thành công' : 'Paid'}
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge className='bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                            <Spinner className='size-2.5' /> {isVi ? 'Đang chuyển' : 'Processing'}
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge className='bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1 whitespace-nowrap'>
                            <AlertTriangle className='size-2.5' /> {isVi ? 'Thất bại' : 'Failed'}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className='px-3.5 py-2.5 text-muted-foreground text-[11px] whitespace-nowrap'>
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </TableCell>

                      {/* Sticky Action Column */}
                      <TableCell className='px-3.5 py-2.5 text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                        {isFailed ? (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => retryMutation.mutate(batch.id)}
                            disabled={retryMutation.isPending}
                            className='text-amber-700 dark:text-amber-400 hover:text-amber-800 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 h-7 px-2 text-xs gap-1 font-medium'
                          >
                            {retryMutation.isPending ? <Spinner className='size-3' /> : <RotateCcw className='size-3' />}
                            {retryMutation.isPending
                              ? isVi ? 'Đang thử...' : 'Retrying...'
                              : isVi ? 'Thử lại' : 'Retry'}
                          </Button>
                        ) : (
                          <span className='text-[11px] text-muted-foreground/60 italic'>
                            {isVi ? 'Hoàn tất' : 'Matched'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
          <div className='p-3 sm:p-3.5 border-t border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
            <div className='flex items-center gap-3'>
              <span>
                {isVi
                  ? `Hiển thị ${startRecord} – ${endRecord} trên ${totalElements.toLocaleString()} giao dịch chi tiền`
                  : `Showing ${startRecord} – ${endRecord} of ${totalElements.toLocaleString()} payout batches`}
              </span>

              {onPageSizeChange && (
                <div className='flex items-center gap-1.5'>
                  <span className='text-[11px]'>{isVi ? 'Dòng/trang:' : 'Rows:'}</span>
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

            {effectiveTotalPages > 1 && (
              <div className='inline-flex items-center gap-1.5'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page <= 1}
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
                  disabled={page >= effectiveTotalPages}
                  onClick={() => onPageChange?.(page + 1)}
                  className='h-7.5 px-2.5 text-xs rounded-md'
                >
                  {isVi ? 'Tiếp' : 'Next'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
