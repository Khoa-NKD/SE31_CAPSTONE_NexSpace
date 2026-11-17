import { createFileRoute } from '@tanstack/react-router';
import { SeatDetailPage } from '@/features/workspaces/components/seat-detail/seat-detail-page';

export interface SeatDetailSearch {
  workspaceId?: number;
  resourceId?: number;
  floorId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export const Route = createFileRoute('/workspaces/seat-detail')({
  validateSearch: (search: Record<string, unknown>): SeatDetailSearch => ({
    workspaceId:
      Number.isSafeInteger(Number(search.workspaceId)) && Number(search.workspaceId) > 0
        ? Number(search.workspaceId)
        : undefined,
    resourceId:
      Number.isSafeInteger(Number(search.resourceId)) && Number(search.resourceId) > 0
        ? Number(search.resourceId)
        : undefined,
    floorId:
      Number.isSafeInteger(Number(search.floorId)) && Number(search.floorId) > 0
        ? Number(search.floorId)
        : undefined,
    date: typeof search.date === 'string' ? search.date : undefined,
    startTime: typeof search.startTime === 'string' ? search.startTime : undefined,
    endTime: typeof search.endTime === 'string' ? search.endTime : undefined
  }),
  component: SeatDetailRoute,
  head: () => ({
    meta: [{ title: 'Chi tiết vị trí chỗ ngồi & phòng | NexSpace' }]
  })
});

function SeatDetailRoute() {
  const search = Route.useSearch();
  return <SeatDetailPage {...search} />;
}

