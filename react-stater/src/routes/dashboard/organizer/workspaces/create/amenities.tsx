import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepAmenitiesView } from '@/features/organizer-onboarding/components/step-amenities-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/amenities'
)({
  head: () => ({
    meta: [
      { title: 'O08 — Create Workspace: Amenities & Facilities | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 4 of 5: Select workspace equipment, technology infrastructure, ergonomics, and hospitality features.'
      }
    ]
  }),
  component: CreateWorkspaceAmenitiesPage
});

function CreateWorkspaceAmenitiesPage() {
  return (
    <PageContainer>
      <StepAmenitiesView />
    </PageContainer>
  );
}
