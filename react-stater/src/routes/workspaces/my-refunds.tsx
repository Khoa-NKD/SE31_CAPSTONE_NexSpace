import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { MyRefundsPage } from '@/features/customer-bookings/components/my-refunds-page';

const myRefundsSearchSchema = z.object({
  action: z.enum(['cancel', 'complaint', 'bank', 'detail']).optional(),
  bookingId: z.coerce.number().optional(),
  refundId: z.coerce.number().optional()
});

export const Route = createFileRoute('/workspaces/my-refunds')({
  validateSearch: zodValidator(myRefundsSearchSchema),
  component: MyRefundsRoute,
  head: () => ({
    meta: [{ title: 'Quản lý yêu cầu hoàn tiền của tôi — NexSpace' }]
  })
});

function MyRefundsRoute() {
  const search = Route.useSearch();
  return (
    <MyRefundsPage
      initialAction={search.action}
      initialBookingId={search.bookingId}
      initialRefundId={search.refundId}
    />
  );
}
