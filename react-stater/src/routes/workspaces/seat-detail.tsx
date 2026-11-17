import { createFileRoute } from '@tanstack/react-router';
import { SeatDetailPage } from '@/features/workspaces/components/seat-detail/seat-detail-page';

export const Route = createFileRoute('/workspaces/seat-detail')({
  component: SeatDetailRoute,
  head: () => ({
    meta: [{ title: 'Desk A-04 — Executive Hot Desk | NexSpace' }]
  })
});

function SeatDetailRoute() {
  return <SeatDetailPage />;
}

