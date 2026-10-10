import { createFileRoute } from '@tanstack/react-router';
import { BookingConfirmationPage } from '@/features/workspaces/components/confirmation/booking-confirmation-page';

export const Route = createFileRoute('/workspaces/confirmation')({
  component: BookingConfirmationRoute,
  head: () => ({
    meta: [{ title: 'Booking Confirmation & Digital Pass — NexSpace' }]
  })
});

function BookingConfirmationRoute() {
  return <BookingConfirmationPage />;
}

