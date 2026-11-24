import React, { useState } from 'react';
import {
  Calendar,
  Copy,
  Check,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Armchair,
  DoorOpen
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookingItem } from '../data/mock-bookings';

interface BookingsLedgerTableProps {
  items: BookingItem[];
  selectedBookingId?: string;
  onSelectBooking: (item: BookingItem) => void;
  language?: 'vi' | 'en';
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function BookingsLedgerTable({
  items,
  selectedBookingId,
  onSelectBooking,
  language = 'vi',
  page: controlledPage,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange
}: BookingsLedgerTableProps) {
  const isVi = language === 'vi';
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(15);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const page = controlledPage ?? internalPage;
  const pageSize = controlledPageSize ?? internalPageSize;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) onPageSizeChange(newSize);
    else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const pagedItems = items.slice(startIndex, endIndex);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(id);
    setCopiedId(id);
    toast.success(isVi ? `Đã sao chép mã #${id}` : `Copied #${id} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBookingStatusBadge = (status: BookingItem['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap'>
            <span className='size-1.5 rounded-full bg-indigo-500 animate-pulse' aria-hidden='true' />
            {isVi ? 'Đã xác nhận' : 'Confirmed'}
          </span>
        );
      case 'checked_in':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap'>
            <span className='size-1.5 rounded-full bg-emerald-500 animate-ping' aria-hidden='true' />
            {isVi ? 'Đang sử dụng' : 'Checked In'}
          </span>
        );
      case 'completed':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap'>
            <span className='size-1.5 rounded-full bg-muted-foreground/60' aria-hidden='true' />
            {isVi ? 'Hoàn thành' : 'Completed'}
          </span>
        );
      case 'cancelled':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 whitespace-nowrap'>
            <span className='size-1.5 rounded-full bg-rose-500' aria-hidden='true' />
            {isVi ? 'Đã hủy' : 'Cancelled'}
          </span>
        );
    }
  };

  if (items.length === 0) {
    return (
      <div className='p-12 text-center bg-card rounded-xl border border-border/70 shadow-2xs'>
        <Calendar className='size-10 text-muted-foreground mx-auto mb-3 opacity-50' aria-hidden='true' />
        <h3 className='text-sm font-semibold text-foreground'>
          {isVi ? 'Không tìm thấy đơn đặt chỗ phù hợp' : 'No bookings match criteria'}
        </h3>
        <p className='text-xs text-muted-foreground mt-1'>
          {isVi
            ? 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.'
            : 'Try clearing your search query or switching status filters.'}
        </p>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border/70 shadow-2xs overflow-hidden flex flex-col'>
      {/* Table Viewport with Guaranteed Scrollable Min-Width */}
      <div className='overflow-x-auto min-w-0'>
        <table
          className='w-full min-w-[1050px] text-left border-collapse text-xs'
          aria-label='Platform bookings management ledger table'
        >
          <thead>
            <tr className='border-b border-border/80 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9'>
              <th scope='col' className='px-3.5 py-2 w-[160px] min-w-[160px]'>
                {isVi ? 'Mã đặt chỗ' : 'Booking ID'}
              </th>
              <th scope='col' className='px-3.5 py-2 min-w-[200px]'>
                {isVi ? 'Khách hàng' : 'Customer'}
              </th>
              <th scope='col' className='px-3.5 py-2 min-w-[180px]'>
                {isVi ? 'Không gian làm việc' : 'Workspace Hub'}
              </th>
              <th scope='col' className='px-3.5 py-2 w-[150px] min-w-[150px]'>
                {isVi ? 'Chỗ ngồi / Phòng' : 'Resource / Desk'}
              </th>
              <th scope='col' className='px-3.5 py-2 w-[180px] min-w-[180px]'>
                {isVi ? 'Thời gian sử dụng' : 'Time Slot'}
              </th>
              <th scope='col' className='px-3.5 py-2 w-[130px] min-w-[130px] text-right'>
                {isVi ? 'Tổng tiền' : 'Gross Amount'}
              </th>
              <th scope='col' className='px-3.5 py-2 w-[125px] min-w-[125px]'>
                {isVi ? 'Trạng thái' : 'Status'}
              </th>
              <th
                scope='col'
                className='px-3.5 py-2 w-[110px] min-w-[110px] text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'
              >
                {isVi ? 'Thao tác' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border/60'>
            {pagedItems.map((booking) => {
              const isSelected = selectedBookingId === booking.id;
              const isRoom =
                booking.workspace.resourceName.toLowerCase().includes('phòng') ||
                booking.workspace.resourceName.toLowerCase().includes('room');

              return (
                <tr
                  key={booking.id}
                  onClick={() => onSelectBooking(booking)}
                  className={`group cursor-pointer transition-colors hover:bg-muted/40 ${
                    isSelected
                      ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary'
                      : ''
                  }`}
                >
                  {/* Booking ID - Fixed nowrap */}
                  <td className='px-3.5 py-2.5 whitespace-nowrap'>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-mono font-bold text-foreground text-xs group-hover:text-primary transition-colors'>
                        #{booking.id}
                      </span>
                      <button
                        type='button'
                        onClick={(e) => handleCopyId(e, booking.id)}
                        className='p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors'
                        title={isVi ? 'Sao chép mã đơn' : 'Copy Booking ID'}
                        aria-label={`Copy Booking ID #${booking.id}`}
                      >
                        {copiedId === booking.id ? (
                          <Check className='size-3 text-emerald-600' />
                        ) : (
                          <Copy className='size-3' />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className='px-3.5 py-2.5' aria-label={booking.customer.name}>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className='size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 border border-primary/20'>
                        {booking.customer.avatarInitials}
                      </div>
                      <div className='min-w-0'>
                        <div className='font-semibold text-foreground text-xs truncate flex items-center gap-1.5'>
                          <span className='truncate'>{booking.customer.name}</span>
                          <span className='text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/70 shrink-0 font-normal'>
                            {booking.customer.membershipTier}
                          </span>
                        </div>
                        <div className='text-[11px] text-muted-foreground truncate'>
                          {booking.customer.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Workspace Hub */}
                  <td className='px-3.5 py-2.5'>
                    <div className='font-medium text-foreground text-xs truncate max-w-[200px]'>
                      {booking.workspace.name}
                    </div>
                    <div className='text-[11px] text-muted-foreground truncate max-w-[200px]'>
                      {booking.workspace.zone || booking.workspace.address}
                    </div>
                  </td>

                  {/* Resource / Desk */}
                  <td className='px-3.5 py-2.5'>
                    <div className='flex items-center gap-1.5 text-foreground font-medium text-xs'>
                      {isRoom ? (
                        <DoorOpen className='size-3.5 text-muted-foreground shrink-0' />
                      ) : (
                        <Armchair className='size-3.5 text-muted-foreground shrink-0' />
                      )}
                      <span className='truncate'>{booking.workspace.resourceName}</span>
                    </div>
                  </td>

                  {/* Time Slot - Formatted cleanly */}
                  <td className='px-3.5 py-2.5 text-muted-foreground whitespace-nowrap tabular-nums text-xs'>
                    <span>{booking.timeSlot}</span>
                  </td>

                  {/* Gross Amount - Fixed no wrap with currency */}
                  <td className='px-3.5 py-2.5 font-mono font-semibold text-foreground text-right whitespace-nowrap tabular-nums text-xs'>
                    {booking.grossAmountDisplay}
                  </td>

                  {/* Status */}
                  <td className='px-3.5 py-2.5 whitespace-nowrap'>
                    {getBookingStatusBadge(booking.status)}
                  </td>

                  {/* Action - Sticky column with compact button */}
                  <td className='px-3.5 py-2.5 text-right whitespace-nowrap sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(booking);
                      }}
                      className='h-7 px-2.5 text-[11px] gap-1 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all font-medium rounded-lg'
                      aria-label={`Inspect booking details for #${booking.id}`}
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

      {/* Real Interactive Pagination Footer */}
      <div className='p-3 sm:px-4 border-t border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
        {/* Left: Summary text */}
        <div className='flex items-center gap-1'>
          <span>{isVi ? 'Hiển thị' : 'Showing'}</span>
          <strong className='text-foreground font-semibold font-mono'>{startIndex + 1}</strong>
          <span>–</span>
          <strong className='text-foreground font-semibold font-mono'>{endIndex}</strong>
          <span>{isVi ? 'trong tổng số' : 'of'}</span>
          <strong className='text-foreground font-semibold font-mono'>
            {items.length.toLocaleString('vi-VN')}
          </strong>
          <span>{isVi ? 'đơn đặt chỗ' : 'bookings'}</span>
        </div>

        {/* Right: Controls & Page Jump */}
        <div className='flex items-center gap-3'>
          {/* Page size select */}
          <div className='flex items-center gap-1.5'>
            <span className='hidden md:inline'>{isVi ? 'Mỗi trang:' : 'Rows:'}</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              aria-label={isVi ? 'Số dòng mỗi trang' : 'Rows per page'}
              className='h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary'
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page Buttons */}
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className='h-7 w-7 p-0'
              aria-label={isVi ? 'Trang trước' : 'Previous page'}
            >
              <ChevronLeft className='size-3.5' />
            </Button>

            <span className='px-2 font-mono text-xs font-medium text-foreground'>
              {page} / {totalPages}
            </span>

            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className='h-7 w-7 p-0'
              aria-label={isVi ? 'Trang tiếp theo' : 'Next page'}
            >
              <ChevronRight className='size-3.5' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
