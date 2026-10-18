import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { BlockoutManagementView } from '@/features/organizer-blockout/components/blockout-management-view';

export const Route = createFileRoute('/dashboard/organizer/blockout/')({
  head: () => ({
    meta: [
      { title: 'Unavailability & Blockout Hours | NexSpace Organizer Hub' },
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
  return (
    <PageContainer>
      <BlockoutManagementView />
    </PageContainer>
  );
}

