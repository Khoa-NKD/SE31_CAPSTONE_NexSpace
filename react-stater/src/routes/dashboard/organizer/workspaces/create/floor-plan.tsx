import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepFloorPlanView } from '@/features/organizer-onboarding/components/step-floor-plan-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/floor-plan'
)({
  head: () => ({
    meta: [
      { title: 'O10 — Floor Plan & Zones Setup | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Define workspace floor structures, functional zone boundaries, and commercial baseline pricing.'
      }
    ]
  }),
  component: CreateWorkspaceFloorPlanPage
});

function CreateWorkspaceFloorPlanPage() {
  return (
    <PageContainer>
      <StepFloorPlanView />
    </PageContainer>
  );
}
