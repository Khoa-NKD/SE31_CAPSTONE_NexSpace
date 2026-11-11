import { createFileRoute } from '@tanstack/react-router';
import { MyBookingsPage } from '@/features/customer-bookings/components/my-bookings-page';

export const Route = createFileRoute('/workspaces/my-bookings')({
  component: MyBookingsRoute,
  head: () => ({
    meta: [{ title: 'My Bookings & Digital Passes — NexSpace' }]
  })
});

function MyBookingsRoute() {
  return <MyBookingsPage />;
}
