import { createFileRoute } from '@tanstack/react-router';
import { BookingReviewPage } from '@/features/workspaces/components/review/booking-review-page';

export interface BookingReviewSearch {
  workspaceId?: number;
  resourceId?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
}

export const Route = createFileRoute('/workspaces/review')({
  validateSearch: (search: Record<string, unknown>): BookingReviewSearch => ({
    workspaceId:
      Number.isSafeInteger(Number(search.workspaceId)) && Number(search.workspaceId) > 0
        ? Number(search.workspaceId)
        : undefined,
    resourceId:
      Number.isSafeInteger(Number(search.resourceId)) && Number(search.resourceId) > 0
        ? Number(search.resourceId)
        : undefined,
    startTime: typeof search.startTime === 'string' ? search.startTime : undefined,
    endTime: typeof search.endTime === 'string' ? search.endTime : undefined,
    date: typeof search.date === 'string' ? search.date : undefined,
    priceType:
      search.priceType === 'DAILY' || search.priceType === 'MONTHLY'
        ? search.priceType
        : 'HOURLY'
  }),
  component: BookingReviewRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Booking Review & 15-Minute Hold' }]
  })
});

function BookingReviewRoute() {
  const search = Route.useSearch();
  return <BookingReviewPage {...search} />;
}
