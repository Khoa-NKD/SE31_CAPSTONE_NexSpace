import { createFileRoute } from '@tanstack/react-router';
import { SeatsPage } from '@/features/workspaces/components/seats/seats-page';

export const Route = createFileRoute('/workspaces/seats')({
  component: SeatsRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Available Seats & Rooms | Central Tower' }]
  })
});

function SeatsRoute() {
  return <SeatsPage />;
}

