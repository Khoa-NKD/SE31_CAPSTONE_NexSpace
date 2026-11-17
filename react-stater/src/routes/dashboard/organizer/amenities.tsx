import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { OrganizerAmenitiesView } from '@/features/amenities';

export const Route = createFileRoute('/dashboard/organizer/amenities')({
  head: () => ({ meta: [{ title: 'Amenities | NexSpace Organizer' }] }),
  component: () => (
    <PageContainer>
      <OrganizerAmenitiesView />
    </PageContainer>
  )
});

