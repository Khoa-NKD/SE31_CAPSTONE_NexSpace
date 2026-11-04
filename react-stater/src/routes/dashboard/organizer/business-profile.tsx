import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { BusinessProfileView } from '@/features/organizer-business-profile/components/business-profile-view';

export const Route = createFileRoute('/dashboard/organizer/business-profile')({
  head: () => ({ meta: [{ title: 'Business Profile | NexSpace Organizer' }] }),
  component: () => (
    <PageContainer>
      <BusinessProfileView />
    </PageContainer>
  )
});
