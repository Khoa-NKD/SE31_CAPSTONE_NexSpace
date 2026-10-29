import { createFileRoute } from '@tanstack/react-router';
import { BookingReviewPage } from '@/features/workspaces/components/review/booking-review-page';

export const Route = createFileRoute('/workspaces/review')({
  component: BookingReviewRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Booking Review & 10-Minute Hold' }]
  })
});

function BookingReviewRoute() {
  return <BookingReviewPage />;
}

