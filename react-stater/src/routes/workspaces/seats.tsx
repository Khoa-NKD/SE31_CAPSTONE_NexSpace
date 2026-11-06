import { createFileRoute } from '@tanstack/react-router';
import { SeatsPage } from '@/features/workspaces/components/seats/seats-page';

export const Route = createFileRoute('/workspaces/seats')({
  validateSearch: (search: Record<string, unknown>): { workspaceId?: number } => ({
    workspaceId:
      Number.isSafeInteger(Number(search.workspaceId)) && Number(search.workspaceId) > 0
        ? Number(search.workspaceId)
        : undefined
  }),
  component: SeatsRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Available Seats & Rooms | Central Tower' }]
  })
});

function SeatsRoute() {
  const { workspaceId } = Route.useSearch();
  return <SeatsPage workspaceId={workspaceId} />;
}
