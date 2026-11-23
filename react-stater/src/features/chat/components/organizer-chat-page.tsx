import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, Inbox } from '@/components/ui/hugeicons';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversations } from '../api/queries';
import { BookingChatPanel } from './booking-chat-panel';
import type { BookingConversationDto } from '../api/types';

export function OrganizerChatPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const { data: conversationsPage, isLoading } = useConversations({
    role: 'ORGANIZER',
    page: 1,
    size: 50
  });

  const conversations: BookingConversationDto[] = useMemo(
    () => (conversationsPage?.content ?? []) as BookingConversationDto[],
    [conversationsPage?.content]
  );

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const q = searchTerm.toLowerCase();
    return conversations.filter(
      (c: BookingConversationDto) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.bookingCode?.toLowerCase().includes(q) ||
        c.workspaceName?.toLowerCase().includes(q) ||
        c.lastMessagePreview?.toLowerCase().includes(q)
    );
  }, [conversations, searchTerm]);

  // If no conversation selected but list loaded, select first conversation on desktop
  const activeConversation = useMemo(() => {
    if (selectedConversationId) {
      return conversations.find((c: BookingConversationDto) => c.id === selectedConversationId) || null;
    }
    return null;
  }, [conversations, selectedConversationId]);

  return (
    <div className='flex flex-col h-[calc(100vh-5.5rem)] md:h-[calc(100vh-6rem)] max-w-7xl mx-auto w-full min-h-0'>
      {/* Top Header */}
      <div className='flex items-center justify-between pb-3 border-b border-border/60 shrink-0'>
        <div>
          <h1 className='text-lg sm:text-xl font-bold text-foreground flex items-center gap-2'>
            <MessageSquare className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
            <span>Hội thoại & Hỗ trợ Khách hàng</span>
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Trực tiếp giải đáp thắc mắc và hỗ trợ dịch vụ cho các đơn đặt chỗ đã xác nhận
          </p>
        </div>

        <div className='hidden sm:flex items-center gap-2'>
          <Badge variant='outline' className='text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'>
            {conversations.length} cuộc hội thoại
          </Badge>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className='grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 mt-3 overflow-hidden'>
        {/* Left List Column */}
        <div
          className={`md:col-span-5 lg:col-span-4 flex flex-col h-full min-h-0 bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className='p-3 border-b border-border/60 bg-muted/20 shrink-0'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Tìm theo mã đơn, khách, không gian...'
                className='pl-8.5 h-9 text-xs rounded-xl bg-background border-border/80'
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className='flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 p-1'>
            {isLoading ? (
              <div className='p-4 space-y-3'>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className='flex items-center gap-3 p-3'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <div className='space-y-1.5 flex-1'>
                      <Skeleton className='h-3.5 w-24' />
                      <Skeleton className='h-3 w-40' />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground'>
                <Inbox className='h-8 w-8 mb-2 text-muted-foreground/50' />
                <p className='text-xs font-medium text-foreground'>Không có cuộc hội thoại nào</p>
                <p className='text-[11px] text-muted-foreground mt-0.5'>
                  {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Hội thoại sẽ xuất hiện khi có khách đặt chỗ cần hỗ trợ.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv: BookingConversationDto) => {
                const isSelected = conv.id === selectedConversationId;
                const timeStr = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleDateString('vi-VN', {
                      month: 'numeric',
                      day: 'numeric'
                    })
                  : '';

                return (
                  <button
                    type='button'
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-500/10 border border-indigo-500/30 text-foreground font-medium shadow-xs'
                        : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <div className='relative shrink-0'>
                      <Avatar className='h-10 w-10 border border-border/80'>
                        <AvatarImage src={conv.customerAvatarUrl} alt={conv.customerName} />
                        <AvatarFallback className='text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'>
                          {conv.customerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <span className='absolute -top-1 -right-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-[10px] h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center ring-2 ring-card'>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between gap-1'>
                        <h4 className='font-bold text-xs sm:text-sm text-foreground truncate'>
                          {conv.customerName}
                        </h4>
                        <span className='text-[10px] text-muted-foreground shrink-0'>{timeStr}</span>
                      </div>

                      <div className='flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5'>
                        <span>#{conv.bookingCode}</span>
                        <span className='text-muted-foreground font-normal'>•</span>
                        <span className='text-muted-foreground font-normal truncate'>{conv.workspaceName}</span>
                      </div>

                      <p className='text-xs text-muted-foreground truncate mt-1'>
                        {conv.lastMessagePreview || 'Chưa có tin nhắn'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Column */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full min-h-0 ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <BookingChatPanel
              conversationId={activeConversation.id}
              conversation={activeConversation}
              onBack={() => setSelectedConversationId(null)}
              onClose={() => setSelectedConversationId(null)}
              className='h-full'
            />
          ) : (
            <div className='flex flex-col items-center justify-center h-full bg-card border border-border/80 rounded-2xl p-8 text-center text-muted-foreground shadow-xs'>
              <div className='h-16 w-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4'>
                <MessageSquare className='h-8 w-8' />
              </div>
              <h3 className='font-bold text-base text-foreground mb-1'>Chọn một cuộc hội thoại</h3>
              <p className='text-xs text-muted-foreground max-w-sm'>
                Chọn từ danh sách bên trái để xem lịch sử trao đổi và nhắn tin hỗ trợ trực tiếp với khách hàng.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
