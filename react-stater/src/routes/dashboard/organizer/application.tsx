import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { ApprovedApplicationView } from '@/features/organizer-application/components/approved-application-view';
import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';

export const Route = createFileRoute('/dashboard/organizer/application')({
  head: () => ({ meta: [{ title: 'Application Management | NexSpace Organizer' }] }),
  component: ApplicationManagementPage
});

function ApplicationManagementPage() {
  const tr = useOrganizerTranslation();
  return (
    <PageContainer>
      <div className='w-full max-w-6xl space-y-4 pb-6'>
        <OrganizerPageHeader
          title={tr('Application Management')}
          description={tr(
            'View your approved application, cooperation agreement and verification documents.'
          )}
        />
        <ApprovedApplicationView />
      </div>
    </PageContainer>
  );
}
