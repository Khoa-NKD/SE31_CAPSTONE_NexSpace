import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepLocationView } from '@/features/organizer-onboarding/components/step-location-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/location'
)({
  head: () => ({
    meta: [
      { title: 'O06 — Create Workspace: Location & Address | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 2 of 5: Pinpoint street address, urban district, and interactive GPS coordinates.'
      }
    ]
  }),
  component: CreateWorkspaceLocationPage
});

function CreateWorkspaceLocationPage() {
  return (
    <PageContainer>
      <StepLocationView />
    </PageContainer>
  );
}
