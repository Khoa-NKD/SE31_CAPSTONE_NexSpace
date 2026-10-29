import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepOperatingHoursView } from '@/features/organizer-onboarding/components/step-operating-hours-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/hours'
)({
  head: () => ({
    meta: [
      { title: 'O07 — Create Workspace: Operating Hours | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 3 of 5: Configure 24/7 access, daily opening and closing hours, and holiday policies.'
      }
    ]
  }),
  component: CreateWorkspaceHoursPage
});

function CreateWorkspaceHoursPage() {
  return (
    <PageContainer>
      <StepOperatingHoursView />
    </PageContainer>
  );
}
