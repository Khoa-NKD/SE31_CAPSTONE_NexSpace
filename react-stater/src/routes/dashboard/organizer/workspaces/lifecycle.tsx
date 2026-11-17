import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PageContainer from '@/components/layout/page-container';
import { WorkspaceLifecycleView } from '@/features/organizer-workspaces/components/workspace-lifecycle-view';

const lifecycleSearchSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  tab: z.enum(['overview', 'bookings', 'settings', 'audit', 'assets']).optional()
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
  const { id, tab } = Route.useSearch();
  const safeId = id !== undefined && id !== null ? String(id) : undefined;
  return (
    <PageContainer>
      <WorkspaceLifecycleView workspaceId={safeId} initialTab={tab} />
    </PageContainer>
  );
}
