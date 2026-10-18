import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { StepMediaGalleryView } from '@/features/organizer-onboarding/components/step-media-gallery-view';

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/media'
)({
  head: () => ({
    meta: [
      { title: 'O09 — Create Workspace: Media Gallery & Cover Photo | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 5 of 5: Upload workspace high-resolution photos, designate cover photo, and organize gallery.'
      }
    ]
  }),
  component: CreateWorkspaceMediaPage
});

function CreateWorkspaceMediaPage() {
  return (
    <PageContainer>
      <StepMediaGalleryView />
    </PageContainer>
  );
}
