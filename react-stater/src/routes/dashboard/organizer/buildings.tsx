import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { BuildingManagementView } from '@/features/organizer-resources/components/building-management-view';

export const Route = createFileRoute('/dashboard/organizer/buildings')({
  head: () => ({ meta: [{ title: 'Buildings | NexSpace Organizer' }] }),
  component: () => (
    <PageContainer>
      <BuildingManagementView />
    </PageContainer>
  )
});
