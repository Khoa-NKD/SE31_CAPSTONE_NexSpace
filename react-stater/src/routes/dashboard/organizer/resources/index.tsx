import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ResourceManagementView } from '@/features/organizer-resources/components/resource-management-view';

export const Route = createFileRoute('/dashboard/organizer/resources/')({
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
  return (
    <PageContainer>
      <ResourceManagementView />
    </PageContainer>
  );
}
