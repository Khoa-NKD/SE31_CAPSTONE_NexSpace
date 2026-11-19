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
  ArrowLeft
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useConversationMessages } from '../api/queries';
import { useMarkAsReadMutation, useSendMessageMutation } from '../api/mutations';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { BookingChatMessageDto, BookingConversationDto } from '../api/types';

interface BookingChatPanelProps {
  conversationId: number;
  conversation?: BookingConversationDto;
  onClose?: () => void;
  onBack?: () => void;
  className?: string;
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

  // Realtime WebSocket STOMP listener
  const { isConnected } = useChatSocket(conversationId);

  // Queries & Mutations
  const { data: messagesPage, isLoading: loadingMessages } = useConversationMessages(conversationId);
  const sendMessageMutation = useSendMessageMutation(conversationId);
  const markAsReadMutation = useMarkAsReadMutation(conversationId);

  const rawMessages: BookingChatMessageDto[] = messagesPage?.content ?? [];
  // Messages are returned DESC from backend, reverse to display ASC (oldest at top, newest at bottom)
  const messages = [...rawMessages].reverse();

  // Determine counterpart info based on current user
  const isCustomer = currentUser?.id === conversation?.customerId;
  const counterpartName = isCustomer
    ? conversation?.organizerName || 'Ban Quản Lý'
    : conversation?.customerName || 'Khách Hàng';
  const counterpartAvatar = isCustomer
    ? conversation?.organizerAvatarUrl
    : conversation?.customerAvatarUrl;
  const counterpartRole = isCustomer ? 'Chủ không gian / Quản lý' : 'Khách đặt chỗ';

  // Mark as read on mount or when messages change
  const unreadCount = conversation?.unreadCount ?? 0;
  useEffect(() => {
    if (conversationId && unreadCount > 0) {
      markAsReadMutation.mutate();
    }
  }, [conversationId, unreadCount]);

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
  }, [messages.length, scrollToBottom]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = content.trim();
    if (!trimmed || isSendingRef.current || sendMessageMutation.isPending) return;

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
              <AvatarFallback className='bg-primary/10 text-primary font-bold text-xs'>
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
                <Building2 className='h-3 w-3 text-primary/70 shrink-0' />
                <span className='font-medium text-foreground truncate max-w-[150px] sm:max-w-[260px]'>
                  {conversation.workspaceName}
                </span>
                <span>•</span>
                <span className='font-mono font-semibold text-primary shrink-0'>#{conversation.bookingCode}</span>
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          <Badge
            variant='secondary'
            className='hidden sm:inline-flex text-[11px] font-medium bg-primary/10 text-primary border-primary/20 shrink-0'
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
            <Info className='h-3.5 w-3.5 text-primary shrink-0' />
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
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
            <span className='text-xs'>Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-muted-foreground py-12 text-center px-4'>
            <div className='h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3'>
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
            const isMe = msg.senderId === currentUser?.id;
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
                  <Avatar className='h-7 w-7 border border-border/60 shrink-0 mb-0.5'>
                    <AvatarImage src={msg.senderAvatarUrl} alt={msg.senderName} />
                    <AvatarFallback className='text-[10px] bg-muted'>
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[80%] sm:max-w-[70%] space-y-1`}>
                  {!isMe && (
                    <span className='text-[11px] text-muted-foreground font-medium pl-1'>
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-xs shadow-xs'
                        : 'bg-card text-foreground border border-border/80 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <div className={`flex items-center gap-1 text-[10px] text-muted-foreground/70 ${isMe ? 'justify-end pr-1' : 'pl-1'}`}>
                    <span>{timeStr}</span>
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

      {/* Input Composer */}
      <form onSubmit={handleSend} className='p-3 sm:p-4 border-t border-border/60 bg-card flex items-end gap-2 shrink-0'>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          placeholder='Nhập tin nhắn hỗ trợ (Nhấn Enter để gửi)...'
          rows={1}
          className='min-h-[42px] max-h-32 text-xs sm:text-sm resize-none rounded-xl border-border/80 focus-visible:ring-primary/40'
        />
        <Button
          type='submit'
          disabled={!content.trim() || sendMessageMutation.isPending}
          size='icon'
          className='h-[42px] w-[42px] rounded-xl shrink-0 cursor-pointer shadow-xs'
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Send className='h-4 w-4' />
          )}
        </Button>
      </form>
    </div>
  );
}
