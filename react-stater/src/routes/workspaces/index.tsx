import { createFileRoute } from '@tanstack/react-router';
import { WorkspacesPage } from '@/features/workspaces/components/workspaces-page';

export const Route = createFileRoute('/workspaces/')({
  component: WorkspacesRoute,
  head: () => ({
    meta: [{ title: 'NexSpace — Workspace Search & Map Split' }]
  })
});

function WorkspacesRoute() {
  return <WorkspacesPage />;
}

