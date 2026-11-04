import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { adminApplicationSearchSchema } from '@/features/admin-organizers/api/applications';
import { ApplicationsListView } from '@/features/admin-organizers/components/applications-list-view';

export const Route = createFileRoute('/dashboard/admin/organizers/queue')({
  head: () => ({
    meta: [
      { title: 'Organizer Applications | NexSpace Admin Console' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  validateSearch: zodValidator(adminApplicationSearchSchema),
  component: AdminOrganizerApplicationsPage
});

function AdminOrganizerApplicationsPage() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PageContainer
      pageTitle='Organizer applications'
      pageDescription='Submitted applications and current review outcomes.'
    >
      <ApplicationsListView
        filters={filters}
        onChange={(patch) =>
          void navigate({
            search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }),
            resetScroll: false
          })
        }
      />
    </PageContainer>
  );
}
