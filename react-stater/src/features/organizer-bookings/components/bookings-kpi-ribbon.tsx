import { Link } from '@tanstack/react-router';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { Card, CardContent } from '@/components/ui/card';
import type { BookingsKpiSummary } from '../types';

export function BookingsKpiRibbon({
  kpis,
  available = true
}: {
  kpis: BookingsKpiSummary;
  available?: boolean;
}) {
  const c = useOrganizerCopy();
  const cards = [
    [c('Total bookings', 'Tổng lượt đặt'), kpis.totalReservations],
    [c('Confirmed', 'Đã xác nhận'), kpis.confirmedCount],
    [c('Pending payment', 'Chờ thanh toán'), kpis.pendingCount],
    [c('Cancelled / expired', 'Đã hủy / hết hạn'), kpis.cancelledCount]
  ];
  return (
    <section
      aria-label={c('All-time organizer totals', 'Tổng số toàn thời gian của organizer')}
      className='space-y-2'
    >
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {cards.map(([label, value]) => (
          <Card key={label} className='shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs text-muted-foreground'>{label}</p>
              <p className='mt-2 text-2xl font-semibold tabular-nums'>{available ? value : '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className='text-xs text-muted-foreground'>
        {available
          ? c(
              'All-time totals across your workspaces. ',
              'Tổng toàn thời gian của các workspace bạn quản lý. '
            )
          : c('Booking totals are not available yet. ', 'Chưa tải được tổng số đặt chỗ. ')}
        <Link to='/dashboard/organizer/analytics' className='text-primary hover:underline'>
          {c(
            'View financial analytics and date filters',
            'Xem thống kê tiền và lọc theo thời gian'
          )}{' '}
          →
        </Link>
      </p>
    </section>
  );
}
