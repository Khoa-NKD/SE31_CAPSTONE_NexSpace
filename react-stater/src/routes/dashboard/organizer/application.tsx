import { createFileRoute } from '@tanstack/react-router';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';
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
    <PageContainer
      pageTitle={tr('Application Management')}
      pageDescription={tr(
        'Track your application, review administrator feedback and manage your verification documents.'
      )}
    >
      <div className='w-full max-w-6xl space-y-5 pb-6'>
        <div className='flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4'>
          <div className='flex items-center gap-3'>
            <span className='flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <ClipboardCheck className='size-5' aria-hidden='true' />
            </span>
            <div>
              <h2 className='text-sm font-semibold'>{tr('Your organizer application')}</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                {tr('Status, review feedback and documents — all in one place.')}
              </p>
            </div>
          </div>
          <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
            <ShieldCheck className='size-4 text-primary' aria-hidden='true' />
            {tr('Documents stay private')}
          </span>
        </div>
        <ApprovedApplicationView />
      </div>
    </PageContainer>
  );
}
