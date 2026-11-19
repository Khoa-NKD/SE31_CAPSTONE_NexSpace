import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { OrganizerOverview } from '@/features/organizer-overview/components/organizer-overview';

export const Route = createFileRoute('/dashboard/organizer/')({
  head: () => ({ meta: [{ title: 'Organizer Overview | NexSpace' }] }),
  component: () => (
    <PageContainer>
      <OrganizerOverview />
    </PageContainer>
  )
});
