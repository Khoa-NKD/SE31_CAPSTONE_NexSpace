import { formatDateLabel } from '@/lib/format';
import { formatBookingMoney } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import {
  Eye,
  MoreVertical,
  Send,
  Trash2,
  Calendar,
  Clock,
  MapPin
} from '@/components/ui/hugeicons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { BookingItem } from '../types';

interface BookingsTableProps {
  bookings: BookingItem[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
  onViewDetails: (booking: BookingItem) => void;
  onSendReminder: (booking: BookingItem) => void;
  onCancelBooking: (id: string) => void;
}

function BookingState({ booking }: { booking: BookingItem }) {
  const c = useOrganizerCopy();
  const labels: Record<string, string> = {
    PENDING_PAYMENT: c('Awaiting payment', 'Chờ thanh toán'),
    CONFIRMED: c('Confirmed', 'Đã xác nhận'),
    CHECKED_IN: c('Checked in', 'Đã nhận chỗ'),
    COMPLETED: c('Completed', 'Đã hoàn tất'),
    CANCELLED: c('Cancelled', 'Đã hủy'),
    EXPIRED: c('Expired', 'Hết hạn giữ chỗ'),
    NO_SHOW: c('No show', 'Không đến'),
    PENDING_APPROVAL: c('Legacy booking', 'Đơn từ luồng cũ')
  };
  const tones: Record<string, string> = {
    PENDING_PAYMENT: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    CONFIRMED: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    CHECKED_IN: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    COMPLETED: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    CANCELLED: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400'
  };
  const checkIn = {
    CHECKED_IN: c('Checked in', 'Đã nhận chỗ'),
    UPCOMING: c('Upcoming', 'Sắp đến giờ nhận chỗ'),
    AWAITING_PAYMENT: c('Not paid yet', 'Chưa thanh toán'),
    CHECKED_OUT: c('Checked out', 'Đã trả chỗ'),
    RELEASED: c('Released', 'Đã giải phóng chỗ')
  };
  return (
    <div className='space-y-1.5'>
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          tones[booking.status] ?? 'border-border bg-muted text-muted-foreground'
        )}
      >
        <span className='size-1.5 shrink-0 rounded-full bg-current' />
        <span className='truncate'>{labels[booking.status] ?? booking.status}</span>
      </span>
      <p className='truncate text-[11px] text-muted-foreground' title={booking.statusReason}>
        {booking.status === 'PENDING_APPROVAL'
          ? c('Manual approval is no longer supported', 'Không còn áp dụng duyệt thủ công')
          : booking.statusReason || checkIn[booking.checkInState]}
      </p>
    </div>
  );
}

export function BookingsTable({
  bookings,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onViewDetails,
  onSendReminder,
  onCancelBooking
}: BookingsTableProps) {
  const c = useOrganizerCopy();
  const allSelected =
    bookings.length > 0 && bookings.every((booking) => selectedIds.includes(booking.id));
  return (
    <section className='min-w-0 overflow-hidden rounded-2xl border bg-card shadow-xs'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4'>
        <div>
          <h2 className='text-sm font-semibold'>{c('Reservations', 'Danh sách đặt chỗ')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            {c(
              'Bookings are confirmed through the payment flow.',
              'Đơn được xác nhận theo luồng thanh toán.'
            )}
          </p>
        </div>
        <span className='text-xs text-muted-foreground'>
          {c('Scroll horizontally for all columns', 'Kéo ngang để xem đủ các cột')}
        </span>
      </div>
      <Table className='min-w-[1320px] table-fixed'>
        <colgroup>
          <col className='w-12' />
          <col className='w-52' />
          <col className='w-60' />
          <col className='w-56' />
          <col className='w-44' />
          <col className='w-36' />
          <col className='w-48' />
          <col className='w-28' />
        </colgroup>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            <TableHead className='px-4'>
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label={c('Select all rows', 'Chọn tất cả dòng')}
              />
            </TableHead>
            {[
              c('Booking', 'Đơn đặt chỗ'),
              c('Customer', 'Khách hàng'),
              c('Space / location', 'Không gian / vị trí'),
              c('Schedule', 'Lịch sử dụng'),
              c('Total', 'Tổng tiền'),
              c('Status', 'Trạng thái'),
              c('Actions', 'Thao tác')
            ].map((label) => (
              <TableHead key={label} className='px-4 text-xs font-semibold'>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!bookings.length ? (
            <TableRow>
              <TableCell colSpan={8} className='h-40 text-center text-sm text-muted-foreground'>
                {c('No bookings match your filters.', 'Không có đơn đặt chỗ phù hợp với bộ lọc.')}
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((row) => {
              const cancellable = ['PENDING_PAYMENT', 'CONFIRMED'].includes(row.status);
              return (
                <TableRow
                  key={row.id}
                  data-state={selectedIds.includes(row.id) ? 'selected' : undefined}
                  className='align-middle hover:bg-muted/25'
                >
                  <TableCell className='px-4 py-5'>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={() => onToggleSelectRow(row.id)}
                      aria-label={c('Select ', 'Chọn ') + row.bookingCode}
                    />
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <button
                      type='button'
                      onClick={() => onViewDetails(row)}
                      className='max-w-full truncate rounded-md bg-primary/8 px-2.5 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/15'
                      title={row.bookingCode}
                    >
                      {row.bookingCode}
                    </button>
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-xs font-semibold text-primary'>
                        {row.customerInitials}
                      </span>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium' title={row.customerName}>
                          {row.customerName}
                        </p>
                        <p
                          className='mt-1 truncate text-xs text-muted-foreground'
                          title={row.customerEmail}
                        >
                          {row.customerEmail || '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <p className='truncate text-sm font-medium' title={row.resourceName}>
                      {row.resourceName}
                    </p>
                    <p
                      className='mt-1 truncate text-xs text-muted-foreground'
                      title={row.resourceCode}
                    >
                      {row.resourceCode}
                    </p>
                    {row.resourceZone && (
                      <p className='mt-1 flex items-center gap-1 text-[11px] text-muted-foreground'>
                        <MapPin className='size-3 shrink-0' />
                        <span className='truncate'>{row.resourceZone}</span>
                      </p>
                    )}
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <p className='flex items-center gap-1.5 text-sm font-medium tabular-nums'>
                      <Calendar className='size-3.5 text-muted-foreground' />
                      {formatDateLabel(row.reservedDate)}
                    </p>
                    <p className='mt-1.5 flex items-start gap-1.5 text-xs tabular-nums text-muted-foreground'>
                      <Clock className='mt-0.5 size-3 shrink-0' />
                      <span className='whitespace-normal leading-relaxed'>
                        {row.reservedTimeWindow}
                      </span>
                    </p>
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        row.status === 'CANCELLED' && 'text-muted-foreground'
                      )}
                    >
                      {formatBookingMoney(row.amount)}
                    </p>
                    <p className='mt-1.5 text-[11px] text-muted-foreground'>
                      {row.paymentGatewayLabel || '—'}
                    </p>
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <BookingState booking={row} />
                  </TableCell>
                  <TableCell className='px-4 py-5'>
                    <div className='flex items-center gap-1'>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        className='size-8 rounded-lg'
                        onClick={() => onViewDetails(row)}
                        aria-label={c('View details ', 'Xem chi tiết ') + row.bookingCode}
                        title={c('View details', 'Xem chi tiết')}
                      >
                        <Eye className='size-4' />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='size-8 rounded-lg'
                            aria-label={c('More actions ', 'Thao tác khác ') + row.bookingCode}
                          >
                            <MoreVertical className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-52'>
                          <DropdownMenuItem onClick={() => onViewDetails(row)}>
                            <Eye className='size-4' />
                            {c('View details', 'Xem chi tiết')}
                          </DropdownMenuItem>
                          {['PENDING_PAYMENT', 'CONFIRMED'].includes(row.status) && (
                            <DropdownMenuItem onClick={() => onSendReminder(row)}>
                              <Send className='size-4' />
                              {row.status === 'PENDING_PAYMENT'
                                ? c('Payment reminder', 'Nhắc thanh toán')
                                : c('Resend confirmation', 'Gửi lại xác nhận')}
                            </DropdownMenuItem>
                          )}
                          {cancellable && (
                            <DropdownMenuItem
                              onClick={() => onCancelBooking(row.id)}
                              className='text-destructive focus:text-destructive'
                            >
                              <Trash2 className='size-4' />
                              {c('Cancel reservation', 'Hủy đặt chỗ')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
