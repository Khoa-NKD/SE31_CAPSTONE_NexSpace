import { createFileRoute, redirect } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { WorkspaceSiteStep } from '@/features/organizer-onboarding/components/workspace-site-step';

export const Route = createFileRoute('/dashboard/organizer/workspaces/create/location')({
  validateSearch: (
    search: Record<string, unknown>
  ): { id?: string; studio?: boolean; stage?: 'floors'; mode?: 'edit' | 'create' } => {
    const id = Number(search.id ?? search.workspaceId);
    return {
      id: Number.isSafeInteger(id) && id > 0 ? String(id) : undefined,
      mode: search.mode === 'edit' || search.mode === 'create' ? search.mode : undefined,
      stage: search.stage === 'floors' ? 'floors' : undefined,
      studio: search.studio === true ? true : undefined
    };
  },
  beforeLoad: ({ search }) => {
    if (!search.id) throw redirect({ to: '/dashboard/organizer/workspaces/create', replace: true });
  },
  component: LocationPage
});

function LocationPage() {
  const { id, studio, stage } = Route.useSearch();
  return (
    <PageContainer>
      <WorkspaceSiteStep workspaceId={Number(id)} studio={!!studio} stage={stage} />
    </PageContainer>
  );
}
