import { Messenger } from './messenger';

interface ChatViewPageProps {
  initialConversationId?: number;
}

export default function ChatViewPage({ initialConversationId }: ChatViewPageProps) {
  return (
    <div className='flex min-h-0 flex-1 px-3 py-2 md:px-6'>
      <Messenger initialConversationId={initialConversationId} />
    </div>
  );
}
