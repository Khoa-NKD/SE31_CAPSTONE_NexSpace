import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { BookingConfirmationPage } from '@/features/workspaces/components/confirmation/booking-confirmation-page';

const confirmationSearchSchema = z.object({
  bookingId: z.coerce.number().optional(),
  bookingCode: z.string().optional(),
  orderRef: z.string().optional()
});

export const Route = createFileRoute('/workspaces/confirmation')({
  validateSearch: zodValidator(confirmationSearchSchema),
  component: BookingConfirmationRoute,
  head: () => ({
    meta: [{ title: 'Booking Confirmation & Digital Pass — NexSpace' }]
  })
});

function BookingConfirmationRoute() {
  const search = Route.useSearch();
  return <BookingConfirmationPage {...search} />;
}
