import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceDetailPage } from '@/features/workspaces/components/detail/workspace-detail-page';

export const Route = createFileRoute('/workspaces/$workspaceId')({
  component: WorkspaceDetailRoute,
  head: () => ({
    meta: [{ title: 'NexSpace Central Tower — Executive Co-working Hub | NexSpace' }]
  })
});

function WorkspaceDetailRoute() {
  return <WorkspaceDetailPage />;
}

