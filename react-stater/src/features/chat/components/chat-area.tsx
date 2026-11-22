import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Loader2, MessageSquare, Info, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AiToneMode, BookingChatMessageDto, BookingConversationDto } from '../api/types';
import { useAiSmartReplies } from '../api/queries';
import { useAdjustToneMutation, useSummarizeConversationMutation } from '../api/mutations';
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

  const {
    data: smartRepliesData,
    isLoading: isLoadingSmartReplies,
    refetch: refetchSmartReplies
  } = useAiSmartReplies(conversation.id);

  const [privateSummary, setPrivateSummary] = useState<string | null>(null);

  // Xóa bản tóm tắt cũ khi chuyển đổi cuộc hội thoại
  useEffect(() => {
    setPrivateSummary(null);
  }, [conversation.id]);

  const adjustToneMutation = useAdjustToneMutation(conversation.id);
  const summarizeMutation = useSummarizeConversationMutation(conversation.id);

  const handleSummarize = () => {
    summarizeMutation.mutate(undefined, {
      onSuccess: (data) => {
        setPrivateSummary(data.summary);
        toast.success('Đã tổng hợp cuộc trò chuyện (Chỉ riêng bạn thấy)');
      }
    });
  };

  const handleAdjustTone = (mode: AiToneMode) => {
    if (!draft.trim()) {
      toast.info('Vui lòng nhập tin nhắn vào ô soạn thảo trước khi nhờ AI hỗ trợ');
      return;
    }
    adjustToneMutation.mutate(
      { text: draft, mode },
      {
        onSuccess: (data) => {
          onDraftChange(data.adjustedText);
          toast.success('Đã tinh chỉnh văn phong bằng NexSpace AI');
        }
      }
    );
  };

  return (
    <AnimatePresence initial={false} mode='wait'>
      <motion.div
        key={conversation.id}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className='border-border/60 bg-card/90 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border p-3.5 shadow-xs sm:gap-3.5 sm:p-4 lg:col-start-2 lg:col-end-3 lg:rounded-2xl'
      >
        {/* Chat Header */}
        <ChatHeader
          conversation={conversation}
          isConnected={isConnected}
          isCustomer={isCustomer}
          onBack={onBack}
        />

        {/* Booking Context Banner */}
        <div className='px-3.5 py-2 bg-muted/30 border border-border/50 rounded-xl text-xs text-muted-foreground flex items-center justify-between gap-2 shrink-0'>
          <div className='flex items-center gap-1.5 truncate'>
            <Info className='h-3.5 w-3.5 text-indigo-500 shrink-0' />
            <span className='truncate'>
              Kênh hỗ trợ đơn <strong className='text-foreground font-mono'>#{conversation.bookingCode}</strong>
              {conversation.workspaceAddress && ` • ${conversation.workspaceAddress}`}
            </span>
          </div>
          <span className='font-mono text-[10px] bg-background/80 px-2 py-0.5 rounded-md border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0'>
            {conversation.bookingStatus}
          </span>
        </div>

        {/* Private AI Chat Summary Banner (Organizer only - Khách hàng hoàn toàn không thấy) */}
        {!isCustomer && privateSummary && (
          <div className='p-3 sm:p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-card border border-purple-500/30 rounded-xl relative text-xs shadow-xs shrink-0 animate-in fade-in slide-in-from-top-2 duration-200'>
            <div className='flex items-center justify-between pb-1.5 border-b border-purple-500/20 mb-2'>
              <div className='flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold'>
                <Sparkles className='h-4 w-4 text-purple-500 shrink-0' />
                <span>Tóm tắt cuộc trò chuyện (Chỉ riêng bạn thấy)</span>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setPrivateSummary(null)}
                className='h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer'
                title='Đóng tóm tắt'
              >
                <X className='h-3.5 w-3.5' />
              </Button>
            </div>
            <div className='whitespace-pre-line text-foreground/90 leading-relaxed font-sans max-h-48 overflow-y-auto pr-1'>
              {privateSummary}
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div
          ref={messagesContainerRef}
          className='relative min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted/70 [&::-webkit-scrollbar-thumb]:rounded-full'
          aria-live='off'
          aria-label={'Lịch sử tin nhắn với ' + counterpartName}
        >
          {isLoadingMessages ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2'>
              <Loader2 className='h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400' />
              <span className='text-xs'>Đang tải tin nhắn...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-12 text-center px-4'>
              <div className='h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs'>
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
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                />
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
          smartReplies={smartRepliesData?.suggestions}
          isLoadingSmartReplies={isLoadingSmartReplies}
          onRefreshSmartReplies={() => refetchSmartReplies()}
          onAdjustTone={handleAdjustTone}
          isAdjustingTone={adjustToneMutation.isPending}
          isCustomer={isCustomer}
          onSummarize={!isCustomer ? handleSummarize : undefined}
          isSummarizing={summarizeMutation.isPending}
        />
      </motion.div>
    </AnimatePresence>
  );
}
