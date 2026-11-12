import { createFileRoute } from '@tanstack/react-router';
import { BookingHistoryPage } from '@/features/workspaces/components/history/booking-history-page';

export const Route = createFileRoute('/workspaces/history')({
  component: BookingHistoryRoute,
  head: () => ({
    meta: [{ title: 'Lịch sử đặt chỗ — NexSpace' }]
  })
});

function BookingHistoryRoute() {
  return <BookingHistoryPage />;
}
