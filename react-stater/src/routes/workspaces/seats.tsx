import { createFileRoute } from '@tanstack/react-router';
import { SeatsPage } from '@/features/workspaces/components/seats/seats-page';

export interface SeatsSearch {
  workspaceId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  floorId?: number;
  resourceId?: number;
}

export const Route = createFileRoute('/workspaces/seats')({
  validateSearch: (search: Record<string, unknown>): SeatsSearch => ({
    workspaceId:
      Number.isSafeInteger(Number(search.workspaceId)) && Number(search.workspaceId) > 0
        ? Number(search.workspaceId)
        : undefined,
    date: typeof search.date === 'string' ? search.date : undefined,
    startTime: typeof search.startTime === 'string' ? search.startTime : undefined,
    endTime: typeof search.endTime === 'string' ? search.endTime : undefined,
    floorId:
      Number.isSafeInteger(Number(search.floorId)) && Number(search.floorId) > 0
        ? Number(search.floorId)
        : undefined,
    resourceId:
      Number.isSafeInteger(Number(search.resourceId)) && Number(search.resourceId) > 0
        ? Number(search.resourceId)
        : undefined
  }),
  component: SeatsRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Available Seats & Rooms | Central Tower' }]
  })
});

function SeatsRoute() {
  const search = Route.useSearch();
  return <SeatsPage {...search} />;
}
