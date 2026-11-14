import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { FloorSetupView } from '@/features/organizer-resources/components/floor-setup-view';

const positiveId = (value: unknown) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
};

export const Route = createFileRoute('/dashboard/organizer/floorplan/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { workspaceId?: number; floorId?: number; setup?: boolean } => {
    const workspaceId = positiveId(search.workspaceId);
    return {
      workspaceId,
      floorId: workspaceId ? positiveId(search.floorId) : undefined,
      setup: workspaceId && search.setup === true ? true : undefined
    };
  },
  head: () => ({
    meta: [
      { title: 'Interactive 2D Floor Plan Editor | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Arrange published floor layouts and non-bookable furniture separately from seats and rooms.'
      }
    ]
  }),
  component: OrganizerFloorplanPage
});

function OrganizerFloorplanPage() {
  const location = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PageContainer>
      <FloorSetupView
        location={location}
        onNavigate={(search) => {
          void navigate({ search });
        }}
      />
    </PageContainer>
  );
}
