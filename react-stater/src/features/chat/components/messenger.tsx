import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useConversations, useConversationMessages } from '../api/queries';
import { useSendMessageMutation, useMarkAsReadMutation } from '../api/mutations';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { BookingConversationDto, BookingChatMessageDto } from '../api/types';
import { ConversationSelect } from './conversation-select';
import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';

interface MessengerProps {
  initialConversationId?: number;
}

export function Messenger({ initialConversationId }: MessengerProps) {
  const currentUser = useAuthStore((s) => s.user);
  const userRole = getUserRole(currentUser);
  const isCustomer = userRole === 'USER';
  const role = isCustomer ? 'CUSTOMER' : 'ORGANIZER';

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(
    initialConversationId ?? null
  );
  const [draft, setDraft] = useState('');
  const isSendingRef = useRef(false);
  const lastSentAtRef = useRef<number>(0);

  // Fetch live conversations
  const { data: conversationsPage, isLoading: loadingConversations } = useConversations({
    role,
    page: 1,
    size: 50
  });

  const conversations: BookingConversationDto[] = useMemo(
    () => (conversationsPage?.content ?? []) as BookingConversationDto[],
    [conversationsPage?.content]
  );

  // Compute effective active conversation id (fall back to first conversation if available)
  const activeConversationId = useMemo(() => {
    if (selectedConversationId) return selectedConversationId;
    if (conversations.length > 0) return conversations[0].id;
    return null;
  }, [conversations, selectedConversationId]);

  // Find active conversation
  const activeConversation = useMemo(() => {
    if (activeConversationId) {
      return conversations.find((c) => c.id === activeConversationId) || null;
    }
    return null;
  }, [conversations, activeConversationId]);

  // WebSocket STOMP listener
  const { isConnected } = useChatSocket(activeConversation?.id);

  // Messages query for active conversation
  const { data: messagesPage, isLoading: loadingMessages } = useConversationMessages(
    activeConversation?.id ?? 0
  );

  // Messages are returned DESC from backend, reverse to display ASC (oldest at top)
  const messages: BookingChatMessageDto[] = useMemo(() => {
    const raw = messagesPage?.content ?? [];
    // oxlint-disable-next-line unicorn/no-array-reverse
    return [...raw].reverse();
  }, [messagesPage?.content]);

  // Mutations
  const sendMessageMutation = useSendMessageMutation(activeConversation?.id ?? 0);
  const markAsReadMutation = useMarkAsReadMutation(activeConversation?.id ?? 0);

  // Auto mark as read when unread count > 0
  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0) {
      markAsReadMutation.mutate();
    }
  }, [activeConversation, markAsReadMutation]);

  // Handle message submission
  const handleSubmit = useCallback(
    (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (!activeConversation) return;

      const trimmed = draft.trim();
      const now = Date.now();
      if (!trimmed || isSendingRef.current || sendMessageMutation.isPending) return;
      if (now - lastSentAtRef.current < 500) return;

      lastSentAtRef.current = now;
      isSendingRef.current = true;
      setDraft('');

      sendMessageMutation.mutate(
        { content: trimmed, messageType: 'TEXT' },
        {
          onSuccess: () => {
            isSendingRef.current = false;
          },
          onError: () => {
            isSendingRef.current = false;
            // Restore draft text on failure
            setDraft(trimmed);
          }
        }
      );
    },
    [activeConversation, draft, sendMessageMutation]
  );

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:320px_1fr] xl:[grid-template-columns:360px_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      {/* Mobile Selector */}
      {conversations.length > 0 && (
        <ConversationSelect
          conversations={conversations}
          selectedId={activeConversationId}
          onSelect={(id) => setSelectedConversationId(id)}
          isConnected={isConnected}
          isCustomer={isCustomer}
        />
      )}

      {/* Desktop & Mobile Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedId={activeConversationId}
        onSelect={(id) => setSelectedConversationId(id)}
        isLoading={loadingConversations}
        isConnected={isConnected}
        isCustomer={isCustomer}
        className={activeConversation ? 'hidden lg:flex' : 'flex'}
      />

      {/* Chat Area or Empty Selection */}
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          messages={messages}
          isLoadingMessages={loadingMessages}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          isSending={sendMessageMutation.isPending}
          isConnected={isConnected}
          isCustomer={isCustomer}
          currentUserId={currentUser?.id}
          onBack={() => setSelectedConversationId(null)}
        />
      ) : (
        <div className='border-border/40 bg-background/80 hidden lg:flex flex-col items-center justify-center h-full rounded-2xl border p-8 text-center text-muted-foreground backdrop-blur lg:col-start-2 lg:col-end-3 lg:rounded-3xl shadow-xs'>
          <div className='h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs'>
            <MessageSquare className='h-8 w-8' />
          </div>
          <h3 className='font-bold text-base text-foreground mb-1'>Chọn một cuộc hội thoại</h3>
          <p className='text-xs text-muted-foreground max-w-sm'>
            Chọn khách hàng từ danh sách bên trái để xem lịch sử trao đổi và hỗ trợ dịch vụ trực tiếp.
          </p>
        </div>
      )}
    </div>
  );
}
