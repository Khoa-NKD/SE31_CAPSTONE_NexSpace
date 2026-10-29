import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ResourceManagementView } from '@/features/organizer-resources/components/resource-management-view';

export const Route = createFileRoute('/dashboard/organizer/resources/')({
  head: () => ({
    meta: [
      { title: 'O07 — Resource Inventory & Table Management | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Granular control over all bookable desks, pods, private cabins, and conference rooms across Floor 12.'
      }
    ]
  }),
  component: OrganizerResourcesPage
});

function OrganizerResourcesPage() {
  return (
    <PageContainer>
      <ResourceManagementView />
    </PageContainer>
  );
}

