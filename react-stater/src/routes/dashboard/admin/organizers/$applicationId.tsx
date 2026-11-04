import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { adminApplicationSearchSchema } from '@/features/admin-organizers/api/applications';
import { ApplicationDetailsView } from '@/features/admin-organizers/components/application-details-view';

export const Route = createFileRoute('/dashboard/admin/organizers/$applicationId')({
  head: () => ({
    meta: [
      { title: 'Organizer Application Details | NexSpace Admin Console' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  validateSearch: zodValidator(adminApplicationSearchSchema),
  component: AdminApplicationDetailsPage
});

function AdminApplicationDetailsPage() {
  const { applicationId } = Route.useParams();
  const filters = Route.useSearch();
  return (
    <PageContainer
      pageTitle='Organizer application details'
      pageDescription='Submitted business information and verification document metadata.'
    >
      <ApplicationDetailsView applicationId={applicationId} filters={filters} />
    </PageContainer>
  );
}
