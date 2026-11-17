import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PageContainer from '@/components/layout/page-container';
import { StepMediaGalleryView } from '@/features/organizer-onboarding/components/step-media-gallery-view';

const sanitizeId = (val: unknown): string | undefined => {
  if (val == null) return undefined;
  const s = String(val).replace(/^["']+|["']+$/g, '').trim();
  return s.length > 0 ? s : undefined;
};

const mediaSearchSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  workspaceId: z.union([z.string(), z.number()]).optional(),
  mode: z.enum(['create', 'edit']).optional()
});

export const Route = createFileRoute(
  '/dashboard/organizer/workspaces/create/media'
)({
  validateSearch: (search: Record<string, unknown>) => mediaSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: 'O09 — Create Workspace: Media Gallery & Cover Photo | NexSpace Organizer Hub' },
      {
        name: 'description',
        content: 'Step 4 of 4: Upload workspace high-resolution photos, designate cover photo, and organize gallery.'
      }
    ]
  }),
  component: CreateWorkspaceMediaPage
});

function CreateWorkspaceMediaPage() {
  const search = Route.useSearch();
  const rawId = search.id ?? search.workspaceId;
  const targetId = sanitizeId(rawId);
  return (
    <PageContainer>
      <StepMediaGalleryView routeWorkspaceId={targetId} routeMode={search.mode} />
    </PageContainer>
  );
}
