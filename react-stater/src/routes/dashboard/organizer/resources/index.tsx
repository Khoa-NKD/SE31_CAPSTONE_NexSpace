import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ResourceManagementView } from '@/features/organizer-resources/components/resource-management-view';

export const Route = createFileRoute('/dashboard/organizer/resources/')({
  validateSearch: (search: Record<string, unknown>): { workspaceId?: number; floorId?: number } => {
    const workspaceId = Number(search.workspaceId);
    const floorId = Number(search.floorId);
    if (!Number.isSafeInteger(workspaceId) || workspaceId < 1) return {};
    return {
      workspaceId,
      floorId: Number.isSafeInteger(floorId) && floorId > 0 ? floorId : undefined
    };
  },
  head: () => ({
    meta: [
      { title: 'Resource Management | NexSpace Organizer' },
      {
        name: 'description',
        content: 'Manage owned desks and rooms with real inventory, base prices and availability.'
      }
    ]
  }),
  component: OrganizerResourcesPage
});

function OrganizerResourcesPage() {
  const { workspaceId, floorId } = Route.useSearch();
  return (
    <PageContainer>
      <ResourceManagementView
        key={`${workspaceId ?? ''}:${floorId ?? ''}`}
        initialWorkspaceId={workspaceId}
        initialFloorId={floorId}
      />
    </PageContainer>
  );
}
