import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepReviewChecklistView } from '@/features/organizer-onboarding/components/step-review-checklist-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/review'
)({
  head: () => ({
    meta: [
      { title: 'O15 — Pre-submission Review Checklist | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Comprehensive pre-flight audit checklist and marketplace publication verification.'
      }
    ]
  }),
  component: CreateWorkspaceReviewPage
});

function CreateWorkspaceReviewPage() {
  return (
    <PageContainer>
      <StepReviewChecklistView />
    </PageContainer>
  );
}
