import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PageContainer from '@/components/layout/page-container';
import { WorkspaceLifecycleView } from '@/features/organizer-workspaces/components/workspace-lifecycle-view';

const lifecycleSearchSchema = z.object({
  id: z.string().optional()
});

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/lifecycle'
)({
  validateSearch: (search) => lifecycleSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: 'O16 — Workspace Status & Lifecycle Control | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Operational governance, marketplace visibility switches, emergency kill switch, and live occupancy monitoring.'
      }
    ]
  }),
  component: WorkspaceLifecyclePage
});

function WorkspaceLifecyclePage() {
  const { id } = Route.useSearch();
  return (
    <PageContainer>
      <WorkspaceLifecycleView workspaceId={id} />
    </PageContainer>
  );
}
