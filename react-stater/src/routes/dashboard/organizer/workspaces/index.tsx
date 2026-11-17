import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { WorkspacesDashboardView } from '@/features/organizer-workspaces/components/workspaces-dashboard-view';

export const Route = createFileRoute('/dashboard/organizer/workspaces/')({
  head: () => ({
    meta: [
      { title: 'O04 — My Workspaces Dashboard | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Manage, monitor occupancy, and configure flexible workspace venues.'
      }
    ]
  }),
  component: OrganizerWorkspacesDashboardPage
});

function OrganizerWorkspacesDashboardPage() {
  return (
    <PageContainer>
      <WorkspacesDashboardView />
    </PageContainer>
  );
}
