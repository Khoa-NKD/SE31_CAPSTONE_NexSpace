import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepBasicInfoView } from '@/features/organizer-onboarding/components/step-basic-info-view';

export const Route = createFileRoute('/dashboard/organizer/workspaces/create/')({
  head: () => ({
    meta: [
      { title: 'O05 — Create Workspace: Basic Info | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 1 of 5: Configure public title, category, and specifications for your workspace.'
      }
    ]
  }),
  component: CreateWorkspaceBasicInfoPage
});

function CreateWorkspaceBasicInfoPage() {
  return (
    <PageContainer>
      <StepBasicInfoView />
    </PageContainer>
  );
}
