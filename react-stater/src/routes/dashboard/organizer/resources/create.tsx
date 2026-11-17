import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ResourceManagementView } from '@/features/organizer-resources/components/resource-management-view';

export const Route = createFileRoute('/dashboard/organizer/resources/create')({
  head: () => ({
    meta: [
      { title: 'Create Seat/Room | NexSpace Organizer' },
      {
        name: 'description',
        content:
          'Create a draft desk or room within an owned workspace and publish through validated activation.'
      }
    ]
  }),
  component: CreateResourcePage
});

function CreateResourcePage() {
  return (
    <PageContainer>
      <ResourceManagementView initialCreate />
    </PageContainer>
  );
}
