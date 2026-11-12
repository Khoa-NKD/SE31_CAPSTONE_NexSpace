import { createFileRoute } from '@tanstack/react-router';
import { BookingConfirmationPage } from '@/features/workspaces/components/confirmation/booking-confirmation-page';

export interface BookingConfirmationSearch {
  bookingCode?: string;
  orderRef?: string;
  bookingId?: number;
}

export const Route = createFileRoute('/workspaces/confirmation')({
  validateSearch: (search: Record<string, unknown>): BookingConfirmationSearch => ({
    bookingCode: typeof search.bookingCode === 'string' ? search.bookingCode : undefined,
    orderRef: typeof search.orderRef === 'string' ? search.orderRef : undefined,
    bookingId:
      Number.isSafeInteger(Number(search.bookingId)) && Number(search.bookingId) > 0
        ? Number(search.bookingId)
        : undefined
  }),
  component: BookingConfirmationRoute,
  head: () => ({
    meta: [{ title: 'Booking Confirmation & Digital Pass — NexSpace' }]
  })
});

function BookingConfirmationRoute() {
  const search = Route.useSearch();
  return <BookingConfirmationPage {...search} />;
}
