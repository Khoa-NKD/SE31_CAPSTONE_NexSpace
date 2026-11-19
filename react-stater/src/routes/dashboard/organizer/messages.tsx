import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { OrganizerChatPage } from '@/features/chat/components/organizer-chat-page';

export const Route = createFileRoute('/dashboard/organizer/messages')({
  head: () => ({ meta: [{ title: 'Hội thoại & Hỗ trợ | NexSpace Organizer' }] }),
  component: () => (
    <PageContainer>
      <OrganizerChatPage />
    </PageContainer>
  )
});
