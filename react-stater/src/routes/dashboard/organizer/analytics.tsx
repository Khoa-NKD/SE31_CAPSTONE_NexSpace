import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { OrganizerAnalyticsView } from '@/features/organizer-analytics/components/analytics-view';

export const Route = createFileRoute('/dashboard/organizer/analytics')({
  head: () => ({ meta: [{ title: 'Analytics | NexSpace Organizer' }] }),
  component: () => (
    <PageContainer>
      <OrganizerAnalyticsView />
    </PageContainer>
  )
});
