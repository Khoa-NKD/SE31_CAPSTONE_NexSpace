import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ChatViewPage from '@/features/chat/components/chat-view-page';

const chatSearchSchema = z.object({
  conversationId: z.coerce.number().optional()
});

export const Route = createFileRoute('/dashboard/chat')({
  validateSearch: (search: Record<string, unknown>) => chatSearchSchema.parse(search),
  head: () => ({ meta: [{ title: 'Trò chuyện & Hỗ trợ | NexSpace' }] }),
  component: ChatRouteComponent
});

function ChatRouteComponent() {
  const search = Route.useSearch();
  return <ChatViewPage initialConversationId={search.conversationId} />;
}
