import React from 'react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { BlockoutManagementView } from '@/features/organizer-blockout/components/blockout-management-view';

export const Route = createFileRoute('/dashboard/organizer/blockout/')({
  validateSearch: z.object({ workspaceId: z.coerce.number().int().positive().optional() }),
  head: () => ({
    meta: [
      { title: 'Maintenance schedule | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Manage operational downtime, HVAC maintenance, and private enterprise reserve schedules to prevent booking conflicts.'
      }
    ]
  }),
  component: OrganizerBlockoutPage
});

function OrganizerBlockoutPage() {
  const { workspaceId } = Route.useSearch();
  return (
    <PageContainer>
      <BlockoutManagementView initialWorkspaceId={workspaceId} />
    </PageContainer>
  );
}

