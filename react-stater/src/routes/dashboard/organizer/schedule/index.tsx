import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ScheduleManagementView } from '@/features/organizer-schedule';

export const Route = createFileRoute('/dashboard/organizer/schedule/')({
  head: () => ({
    meta: [
      { title: 'Resource Schedule & Gantt Timeline | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Interactive real-time schedule audit, booking allocation, and maintenance blocks across all floor resources in Gantt timeline view.'
      }
    ]
  }),
  component: OrganizerSchedulePage
});

function OrganizerSchedulePage() {
  return (
    <PageContainer>
      <ScheduleManagementView />
    </PageContainer>
  );
}

