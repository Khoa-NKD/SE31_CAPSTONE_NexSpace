import { Spinner as Loader2 } from '@/components/ui/spinner';
import { FormEvent, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MessageSquare, Info } from '@/components/ui/hugeicons';
import type { BookingChatMessageDto, BookingConversationDto } from '../api/types';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';

interface ChatAreaProps {
  conversation: BookingConversationDto;
  messages: BookingChatMessageDto[];
  isLoadingMessages: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => void;
  isSending?: boolean;
  isConnected: boolean;
  isCustomer: boolean;
  currentUserId?: number;
  onBack?: () => void;
}

export function ChatArea({
  conversation,
  messages,
  isLoadingMessages,
  draft,
  onDraftChange,
  onSubmit,
  isSending = false,
  isConnected,
  isCustomer,
  currentUserId,
  onBack
}: ChatAreaProps) {
  const shouldReduceMotion = useReducedMotion();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const behavior = shouldReduceMotion ? 'auto' : 'smooth';

    const scrollToBottom = () => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    };

    if (behavior === 'smooth') {
      requestAnimationFrame(scrollToBottom);
    } else {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, conversation.id, shouldReduceMotion]);

  const counterpartName = isCustomer
    ? conversation.organizerName || 'Ban Quản Lý'
    : conversation.customerName || 'Khách Hàng';

  return (
    <AnimatePresence initial={false} mode='wait'>
      <motion.div
        key={conversation.id}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className='border-border/40 bg-background/80 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur sm:gap-3.5 sm:p-4 lg:col-start-2 lg:col-end-3 lg:rounded-3xl'
      >
        {/* Chat Header */}
        <ChatHeader
          conversation={conversation}
          isConnected={isConnected}
          isCustomer={isCustomer}
          onBack={onBack}
        />

        {/* Booking Context Banner */}
        <div className='px-3.5 py-2 bg-muted/40 border border-border/40 rounded-xl text-xs text-muted-foreground flex items-center justify-between gap-2 shrink-0'>
          <div className='flex items-center gap-1.5 truncate'>
            <Info className='h-3.5 w-3.5 text-primary shrink-0' />
            <span className='truncate'>
              Kênh hỗ trợ đơn{' '}
              <strong className='text-foreground font-mono'>#{conversation.bookingCode}</strong>
              {conversation.workspaceAddress && ` • ${conversation.workspaceAddress}`}
            </span>
          </div>
          <span className='font-mono text-[10px] bg-background/80 px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground shrink-0'>
            {conversation.bookingStatus}
          </span>
        </div>

        {/* Messages Stream */}
        <div
          ref={messagesContainerRef}
          className='relative min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted/70 [&::-webkit-scrollbar-thumb]:rounded-full'
          aria-live='off'
          aria-label={'Lịch sử tin nhắn với ' + counterpartName}
        >
          {isLoadingMessages ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2'>
              <Loader2 className='h-6 w-6  text-primary' />
              <span className='text-xs'>Đang tải tin nhắn...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-12 text-center px-4'>
              <div className='h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-xs'>
                <MessageSquare className='h-6 w-6' />
              </div>
              <h5 className='font-bold text-sm text-foreground mb-1'>Bắt đầu cuộc trò chuyện</h5>
              <p className='text-xs text-muted-foreground max-w-sm'>
                {isCustomer
                  ? 'Bạn có thể hỏi chủ không gian về đường đi, mã PIN cửa, tiện ích bàn làm việc hoặc các yêu cầu đặc biệt.'
                  : 'Hãy gửi lời chào hoặc cung cấp thông tin check-in hữu ích cho khách đặt chỗ này.'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} currentUserId={currentUserId} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Composer */}
        <MessageComposer
          draft={draft}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          contactName={counterpartName}
          isSending={isSending}
        />
      </motion.div>
    </AnimatePresence>
  );
}
