import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  Building2,
  Check,
  CheckCheck,
  MessageSquare,
  Info,
  X,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Wand2,
  HeartHandshake,
  Zap,
  Globe2,
  Bot
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useConversationMessages, useAiSmartReplies } from '../api/queries';
import { useMarkAsReadMutation, useSendMessageMutation, useAdjustToneMutation } from '../api/mutations';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { BookingChatMessageDto, BookingConversationDto, AiToneMode } from '../api/types';

interface BookingChatPanelProps {
  conversationId: number;
  conversation?: BookingConversationDto;
  onClose?: () => void;
  onBack?: () => void;
  className?: string;
}

function renderMessageContent(content: string, isMe: boolean, isAi: boolean) {
  if (!content) return null;

  // Split content by <code>...</code> or `...`
  const parts = content.split(/(<code>[\s\S]*?<\/code>|`[^`]+`)/gi);

  return parts.map((part, index) => {
    const codeTagMatch = part.match(/^<code>([\s\S]*?)<\/code>$/i);
    if (codeTagMatch) {
      return (
        <code
          key={index}
          className={cn(
            'rounded-md px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold select-all mx-0.5 inline-block',
            isMe
              ? 'bg-white/20 text-white border border-white/30'
              : isAi
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
              : 'bg-muted text-foreground border border-border/60'
          )}
        >
          {codeTagMatch[1]}
        </code>
      );
    }

    const backtickMatch = part.match(/^`([^`]+)`$/);
    if (backtickMatch) {
      return (
        <code
          key={index}
          className={cn(
            'rounded-md px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold select-all mx-0.5 inline-block',
            isMe
              ? 'bg-white/20 text-white border border-white/30'
              : isAi
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
              : 'bg-muted text-foreground border border-border/60'
          )}
        >
          {backtickMatch[1]}
        </code>
      );
    }

    const cleanText = part.replace(/<[^>]+>/g, '');
    return <span key={index}>{cleanText}</span>;
  });
}

export function BookingChatPanel({
  conversationId,
  conversation,
  onClose,
  onBack,
  className = ''
}: BookingChatPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const isComposingRef = useRef(false);
  const lastSentAtRef = useRef<number>(0);

  // Realtime WebSocket STOMP listener
  const { isConnected } = useChatSocket(conversationId);

  // Queries & Mutations
  const { data: messagesPage, isLoading: loadingMessages } = useConversationMessages(conversationId);
  const sendMessageMutation = useSendMessageMutation(conversationId);
  const markAsReadMutation = useMarkAsReadMutation(conversationId);
  const {
    data: smartRepliesData,
    isLoading: isLoadingSmartReplies,
    refetch: refetchSmartReplies
  } = useAiSmartReplies(conversationId);
  const adjustToneMutation = useAdjustToneMutation(conversationId);

  const handleAdjustTone = (mode: AiToneMode) => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.info('Vui lòng nhập tin nhắn vào ô soạn thảo trước khi nhờ AI hỗ trợ');
      return;
    }
    adjustToneMutation.mutate(
      { text: trimmed, mode },
      {
        onSuccess: (data) => {
          setContent(data.adjustedText);
          toast.success('Đã tinh chỉnh văn phong bằng NexSpace AI');
        }
      }
    );
  };

  const rawMessages: BookingChatMessageDto[] = messagesPage?.content ?? [];
  // Messages are returned DESC from backend, reverse to display ASC (oldest at top, newest at bottom)
  // oxlint-disable-next-line unicorn/no-array-reverse
  const messages = [...rawMessages].reverse();

  // Determine counterpart info based on current user
  const isCustomer =
    Number(currentUser?.id) === Number(conversation?.customerId) ||
    currentUser?.role === 'USER' ||
    currentUser?.role === 'CUSTOMER';
  const counterpartName = isCustomer
    ? conversation?.organizerName || 'Ban Quản Lý'
    : conversation?.customerName || 'Khách Hàng';
  const counterpartAvatar = isCustomer
    ? conversation?.organizerAvatarUrl
    : conversation?.customerAvatarUrl;
  const counterpartRole = isCustomer ? 'Chủ không gian / Quản lý' : 'Khách đặt chỗ';

  // Mark as read on mount or when messages change (strictly guarded once per unread state)
  const lastMarkedRef = useRef<{ id: number; unreadCount: number } | null>(null);
  const unreadCount = conversation?.unreadCount ?? 0;
  useEffect(() => {
    if (
      conversationId &&
      unreadCount > 0 &&
      (lastMarkedRef.current?.id !== conversationId || lastMarkedRef.current?.unreadCount !== unreadCount)
    ) {
      lastMarkedRef.current = { id: conversationId, unreadCount };
      markAsReadMutation.mutate(undefined, {
        onError: () => {
          lastMarkedRef.current = null;
        }
      });
    }
  }, [conversationId, unreadCount, markAsReadMutation]);

  // Autoscroll to bottom without scrolling outer window or ancestors
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [messages.length, scrollToBottom]);

  const handleSend = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = content.trim();
    const now = Date.now();
    // Chặn gửi rỗng, chặn gửi trùng lặp hoặc gửi liên tiếp trong vòng 600ms
    if (!trimmed || isSendingRef.current || sendMessageMutation.isPending) return;
    if (now - lastSentAtRef.current < 600) return;

    lastSentAtRef.current = now;
    isSendingRef.current = true;
    setContent(''); // Xóa nội dung trong ô nhập ngay lập tức (optimistic)

    sendMessageMutation.mutate(
      { content: trimmed, messageType: 'TEXT' },
      {
        onSuccess: () => {
          isSendingRef.current = false;
          setTimeout(() => scrollToBottom('smooth'), 50);
        },
        onError: () => {
          isSendingRef.current = false;
          // Khôi phục lại nội dung nếu có lỗi gửi thực sự
          setContent(trimmed);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Không gửi khi đang soạn thảo tiếng Việt có dấu (IME composing / Telex / VNI trên macOS / Windows)
    if (e.nativeEvent.isComposing || isComposingRef.current || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 bg-background border border-border/70 rounded-2xl overflow-hidden shadow-xs ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/60 bg-muted/30 shrink-0'>
        <div className='flex items-center gap-3 min-w-0'>
          {onBack && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={onBack}
              className='md:hidden h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg shrink-0 -ml-1 mr-0.5'
              aria-label='Quay lại danh sách'
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
          )}

          <div className='relative shrink-0'>
            <Avatar className='h-9 w-9 sm:h-10 sm:w-10 border border-border/80'>
              <AvatarImage src={counterpartAvatar} alt={counterpartName} />
              <AvatarFallback className='bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-xs'>
                {counterpartName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
              title={isConnected ? 'Realtime Connected' : 'Connecting...'}
            />
          </div>

          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h4 className='font-bold text-xs sm:text-sm text-foreground truncate'>{counterpartName}</h4>
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-normal border-border/80 shrink-0'>
                {counterpartRole}
              </Badge>
            </div>
            {conversation && (
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate'>
                <Building2 className='h-3 w-3 text-indigo-500/80 shrink-0' />
                <span className='font-medium text-foreground truncate max-w-[150px] sm:max-w-[260px]'>
                  {conversation.workspaceName}
                </span>
                <span>•</span>
                <span className='font-mono font-semibold text-indigo-600 dark:text-indigo-400 shrink-0'>#{conversation.bookingCode}</span>
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          <Badge
            variant='secondary'
            className='hidden sm:inline-flex text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0'
          >
            Đơn xác nhận
          </Badge>
          {onClose && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={onClose}
              className='h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg'
              aria-label='Đóng'
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      {/* Booking Context Banner */}
      {conversation && (
        <div className='px-4 py-2 bg-muted/40 border-b border-border/40 text-xs text-muted-foreground flex items-center justify-between gap-2 shrink-0'>
          <div className='flex items-center gap-1.5 truncate'>
            <Info className='h-3.5 w-3.5 text-indigo-500 shrink-0' />
            <span className='truncate'>
              Kênh hỗ trợ cho đơn <strong className='text-foreground'>#{conversation.bookingCode}</strong> ({conversation.workspaceAddress})
            </span>
          </div>
          <span className='font-mono text-[10px] text-muted-foreground/80 shrink-0'>
            {conversation.bookingStatus}
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={messagesContainerRef} className='flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-muted/10'>
        {loadingMessages ? (
          <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2'>
            <Loader2 className='h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400' />
            <span className='text-xs'>Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-12 text-center px-4'>
            <div className='h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3'>
              <MessageSquare className='h-6 w-6' />
            </div>
            <h5 className='font-bold text-sm text-foreground mb-1'>Bắt đầu cuộc trò chuyện</h5>
            <p className='text-xs text-muted-foreground max-w-sm'>
              {isCustomer
                ? 'Bạn có thể hỏi chủ không gian về đường đi, mã PIN cửa, tiện ích bàn làm việc hoặc các yêu cầu đặc biệt.'
                : 'Khách hàng có thể cần hỗ trợ thêm thông tin về đơn đặt chỗ này.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAi =
              msg.messageType === 'AI_ASSISTANT' ||
              msg.senderRole === 'AI_ASSISTANT' ||
              msg.senderName?.includes('NexSpace AI');
            const isMe = !isAi && msg.senderId === currentUser?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  isAi ? (
                    <div className='h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0 mb-0.5 shadow-xs ring-1 ring-purple-500/30'>
                      <Sparkles className='h-3.5 w-3.5 animate-pulse' />
                    </div>
                  ) : (
                    <Avatar className='h-7 w-7 border border-border/60 shrink-0 mb-0.5'>
                      <AvatarImage src={msg.senderAvatarUrl} alt={msg.senderName} />
                      <AvatarFallback className='text-[10px] bg-muted'>
                        {msg.senderName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )
                )}

                <div className={`max-w-[80%] sm:max-w-[70%] space-y-1`}>
                  {!isMe && (
                    isAi ? (
                      <div className='flex items-center gap-1.5 pl-1'>
                        <span className='text-[11px] font-semibold text-purple-600 dark:text-purple-400'>
                          NexSpace AI
                        </span>
                        <span className='inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-medium text-purple-600 dark:text-purple-400 border border-purple-500/20'>
                          <Bot className='h-2.5 w-2.5' /> Trợ lý ảo
                        </span>
                      </div>
                    ) : (
                      <span className='text-[11px] text-muted-foreground font-medium pl-1'>
                        {msg.senderName}
                      </span>
                    )
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs shadow-xs'
                        : isAi
                        ? 'border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-card text-foreground rounded-bl-xs shadow-xs'
                        : 'bg-card text-foreground border border-border/80 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {renderMessageContent(msg.content, isMe, isAi)}
                  </div>

                  <div className={`flex items-center gap-1 text-[10px] text-muted-foreground/70 ${isMe ? 'justify-end pr-1' : 'pl-1'}`}>
                    <span>{timeStr}</span>
                    {isAi && (
                      <span className='text-[9px] text-purple-500/80 font-medium ml-1'>• Trả lời tự động</span>
                    )}
                    {isMe && (
                      msg.isRead ? (
                        <span title='Đã đọc'>
                          <CheckCheck className='h-3 w-3 text-emerald-500' />
                        </span>
                      ) : (
                        <span title='Đã gửi'>
                          <Check className='h-3 w-3 text-muted-foreground/60' />
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick AI & Smart Action Bar */}
      <div className='flex items-center gap-1.5 overflow-x-auto px-3.5 py-1.5 bg-muted/20 border-t border-border/50 scrollbar-none'>
        {isCustomer ? (
          // Khách hàng: Gợi ý các câu hỏi trực tiếp cho @NexSpace AI
          <>
            <Badge
              variant='outline'
              className='bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25 text-[10px] font-medium gap-1 px-2 py-0.5 shrink-0 shadow-2xs'
            >
              <Sparkles className='h-3 w-3 animate-pulse text-purple-500' />
              <span className='font-semibold'>Hỏi @NexSpace AI:</span>
            </Badge>

            {[
              '@NexSpace AI Wifi ở đây pass là gì?',
              '@NexSpace AI Hướng dẫn check-in giúp mình',
              '@NexSpace AI Ở đây có chỗ gửi xe không?',
              '@NexSpace AI Tiện ích xung quanh có gì?'
            ].map((prompt) => (
              <button
                key={prompt}
                type='button'
                onClick={() => setContent(prompt)}
                className='border-border/50 bg-background/80 hover:border-purple-500/50 hover:bg-purple-500/5 text-foreground rounded-full border px-2.5 py-0.5 text-[11px] transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95'
                title='Nhấn để điền câu hỏi cho AI'
              >
                {prompt}
              </button>
            ))}
          </>
        ) : (
          // Chủ không gian (Organizer): Gợi ý tổng hợp chat hoặc smart replies
          <>
            <Badge
              variant='outline'
              className='bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25 text-[10px] font-medium gap-1 px-2 py-0.5 shrink-0 shadow-2xs'
            >
              <Sparkles className='h-3 w-3 animate-pulse text-purple-500' />
              <span className='font-semibold'>@NexSpace AI:</span>
            </Badge>

            <button
              type='button'
              onClick={() => setContent('@NexSpace AI tổng hợp đoạn chat đã nhắn gì giúp tôi')}
              className='border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95'
              title='Nhấn để yêu cầu AI tóm tắt nội dung cuộc trò chuyện'
            >
              ✨ Tổng hợp đoạn chat
            </button>

            {isLoadingSmartReplies ? (
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground py-0.5 px-2 animate-pulse'>
                <Loader2 className='h-3 w-3 animate-spin text-indigo-600 dark:text-indigo-400' />
                <span className='text-[10px]'>NexSpace AI đang phân tích...</span>
              </div>
            ) : (
              (smartRepliesData?.suggestions || [
                'Xin chào! NexSpace có thể hỗ trợ gì cho bạn?',
                'Mã PIN check-in của bạn đã sẵn sàng.',
                'Không gian làm việc đã chuẩn bị xong, chào mừng bạn!'
              ]).map((reply) => {
                const cleanReply = reply.replace(/<\/?code>/gi, "'").replace(/<[^>]+>/g, '');
                return (
                  <button
                    key={reply}
                    type='button'
                    onClick={() => setContent(cleanReply)}
                    className='border-border/60 bg-card text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-full border px-2.5 py-0.5 text-[11px] transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95 max-w-[240px] truncate'
                    title={cleanReply}
                  >
                    {cleanReply}
                  </button>
                );
              })
            )}

            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => refetchSmartReplies()}
              disabled={isLoadingSmartReplies}
              className='h-5 w-5 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer'
              title='Làm mới gợi ý AI'
              aria-label='Làm mới gợi ý AI'
            >
              <RefreshCw className={cn('h-2.5 w-2.5', isLoadingSmartReplies && 'animate-spin')} />
            </Button>
          </>
        )}
      </div>

      {/* Input Composer */}
      <div className='p-3 sm:p-4 border-t border-border/60 bg-card flex items-end gap-2 shrink-0'>
        {/* Nút bấm nhanh @AI */}
        <Button
          type='button'
          variant='ghost'
          onClick={() => {
            setContent((prev) => (prev.startsWith('@NexSpace AI ') ? prev : `@NexSpace AI ${prev}`));
          }}
          className='h-[42px] px-2.5 rounded-xl border border-purple-500/25 bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 shrink-0 cursor-pointer transition flex items-center gap-1 font-semibold text-xs'
          title='Nhắc @NexSpace AI để hỏi hoặc tóm tắt'
          aria-label='Nhắc @NexSpace AI'
        >
          <Sparkles className='h-3.5 w-3.5 text-purple-500' />
          <span>@AI</span>
        </Button>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            // Đảm bảo cập nhật chuỗi ký tự tiếng Việt sau khi kết thúc gõ bộ gõ Telex / VNI
            setContent(e.currentTarget.value);
          }}
          placeholder='Nhập tin nhắn (tag @NexSpace AI để hỏi AI)...'
          rows={1}
          className='min-h-[42px] max-h-32 text-xs sm:text-sm resize-none rounded-xl border-border/80 focus-visible:ring-indigo-500/30'
        />

        {/* AI Tone & Writing Assistant Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size='icon'
              disabled={adjustToneMutation.isPending}
              className={cn(
                'h-[42px] w-[42px] rounded-xl border border-indigo-500/25 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 shrink-0 cursor-pointer transition',
                adjustToneMutation.isPending && 'animate-pulse'
              )}
              title='Trợ lý AI tinh chỉnh văn phong'
              aria-label='Trợ lý AI tinh chỉnh văn phong'
            >
              {adjustToneMutation.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400' />
              ) : (
                <Wand2 className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' side='top' className='w-56 p-1.5 shadow-xl rounded-2xl'>
            <DropdownMenuLabel className='text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1.5'>
              <Sparkles className='h-3.5 w-3.5 text-indigo-500' />
              <span>{isCustomer ? 'Trợ lý AI cho Khách hàng' : 'Trợ lý AI cho Chủ không gian'}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAdjustTone('POLITE')}
              className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
            >
              <HeartHandshake className='h-4 w-4 text-rose-500 shrink-0' />
              <div>
                <p className='font-semibold'>{isCustomer ? 'Lịch sự & Lễ phép' : 'Lịch sự & Hiếu khách'}</p>
                <p className='text-[10px] text-muted-foreground'>
                  {isCustomer ? 'Hỏi thăm, nhờ hỗ trợ lịch sự và tôn trọng' : 'Thân thiện, tôn trọng và hiếu khách'}
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAdjustTone('CONCISE')}
              className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
            >
              <Zap className='h-4 w-4 text-amber-500 shrink-0' />
              <div>
                <p className='font-semibold'>Rút gọn súc tích</p>
                <p className='text-[10px] text-muted-foreground'>
                  {isCustomer ? 'Đi thẳng vào thắc mắc cần giải đáp' : 'Ngắn gọn, đi thẳng vào trọng tâm'}
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAdjustTone('TRANSLATE_EN')}
              className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
            >
              <Globe2 className='h-4 w-4 text-blue-500 shrink-0' />
              <div>
                <p className='font-semibold'>Dịch sang Tiếng Anh</p>
                <p className='text-[10px] text-muted-foreground'>
                  {isCustomer ? 'Nhắn tin với Host quốc tế' : 'Hỗ trợ khách nước ngoài'}
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAdjustTone('TRANSLATE_VI')}
              className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
            >
              <Globe2 className='h-4 w-4 text-emerald-500 shrink-0' />
              <div>
                <p className='font-semibold'>Dịch sang Tiếng Việt</p>
                <p className='text-[10px] text-muted-foreground'>Tiếng Việt tự nhiên chuẩn mực</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type='button'
          onClick={handleSend}
          disabled={!content.trim() || sendMessageMutation.isPending}
          size='icon'
          className='h-[42px] w-[42px] rounded-xl shrink-0 cursor-pointer shadow-md bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white active:scale-95 transition'
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Send className='h-4 w-4' />
          )}
        </Button>
      </div>
    </div>
  );
}
