import { useMemo, useState } from 'react';
import { Search, Inbox, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateLabel } from '@/lib/format';
import type { BookingConversationDto } from '../api/types';

interface ConversationListProps {
  conversations: BookingConversationDto[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  isConnected?: boolean;
  isCustomer?: boolean;
  className?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  isConnected = false,
  isCustomer = false,
  className
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.organizerName?.toLowerCase().includes(q) ||
        c.bookingCode?.toLowerCase().includes(q) ||
        c.workspaceName?.toLowerCase().includes(q) ||
        c.lastMessagePreview?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div
      className={cn(
        'border-border/60 bg-card/90 hidden h-full flex-col gap-3.5 overflow-hidden rounded-2xl border p-3.5 shadow-xs lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-2xl',
        className
      )}
    >
      {/* List Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-foreground text-sm font-semibold'>Hội thoại & Hỗ trợ</p>
          <p className='text-muted-foreground text-xs'>
            {conversations.length} cuộc hội thoại
          </p>
        </div>
        <Badge
          variant='outline'
          className={cn(
            'border-border/50 rounded-full border px-2.5 py-0.5 text-[0.7rem] tracking-[0.2em] uppercase font-semibold flex items-center gap-1',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-muted/50 text-muted-foreground'
          )}
        >
          <Radio className={cn('h-2.5 w-2.5', isConnected && 'animate-pulse text-emerald-500')} />
          <span>{isConnected ? 'Trực tuyến' : 'Đang kết nối'}</span>
        </Badge>
      </div>

      {/* Search Input */}
      <label htmlFor='messenger-search' className='sr-only'>
        Tìm kiếm cuộc trò chuyện
      </label>
      <div className='relative'>
        <Search
          className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          aria-hidden='true'
        />
        <Input
          id='messenger-search'
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Tìm theo mã đơn #BK, khách, chỗ...'
          className='border-border/60 bg-background/80 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-indigo-500/30 w-full rounded-xl pl-9 text-xs focus-visible:ring-2 h-9'
        />
      </div>

      {/* Conversation Items */}
      <div
        className='flex-1 space-y-1.5 overflow-y-auto pr-1'
        aria-label='Danh sách hội thoại'
        role='list'
      >
        {isLoading ? (
          <div className='space-y-2 py-1'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='flex items-center gap-3 p-3 rounded-2xl bg-muted/20 animate-pulse'>
                <Skeleton className='h-10 w-10 rounded-2xl shrink-0' />
                <div className='space-y-1.5 flex-1 min-w-0'>
                  <Skeleton className='h-3.5 w-24' />
                  <Skeleton className='h-3 w-36' />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-48 p-4 text-center text-muted-foreground'>
            <Inbox className='h-8 w-8 mb-2 text-muted-foreground/40' />
            <p className='text-xs font-semibold text-foreground'>Không có cuộc hội thoại nào</p>
            <p className='text-[11px] text-muted-foreground mt-0.5 max-w-[200px]'>
              {search
                ? 'Không tìm thấy kết quả phù hợp từ khóa'
                : 'Hội thoại sẽ tự động xuất hiện khi có khách đặt chỗ cần hỗ trợ.'}
            </p>
          </div>
        ) : (
          filtered.map((conversation) => {
            const isActive = conversation.id === selectedId;
            const displayName = isCustomer
              ? conversation.organizerName || 'Ban Quản Lý'
              : conversation.customerName || 'Khách Hàng';
            const avatarUrl = isCustomer
              ? conversation.organizerAvatarUrl
              : conversation.customerAvatarUrl;
            const initials = displayName.slice(0, 2).toUpperCase();
            const timeLabel = conversation.lastMessageAt
              ? formatDateLabel(conversation.lastMessageAt)
              : '';

            return (
              <motion.button
                key={conversation.id}
                type='button'
                onClick={() => onSelect(conversation.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'focus-visible:ring-indigo-500/50 group focus-visible:ring-offset-background relative flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer',
                  isActive
                    ? 'border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-500/15 text-foreground shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-background/60 hover:border-border/80 hover:bg-muted/30'
                )}
                role='listitem'
              >
                {/* Avatar with Status Dot */}
                <div className='relative shrink-0'>
                  <Avatar className='border-border/40 bg-background/80 text-foreground h-10 w-10 rounded-2xl border'>
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className='bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-2xl text-xs font-bold'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'border-background absolute right-0 bottom-0 inline-flex h-2.5 w-2.5 rounded-full border-2',
                      isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                    )}
                    aria-label={isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
                  />
                </div>

                {/* Content */}
                <div className='min-w-0 flex-1 space-y-0.5'>
                  <div className='flex items-start justify-between gap-1'>
                    <p className='text-foreground text-xs sm:text-sm font-semibold truncate'>
                      {displayName}
                    </p>
                    {timeLabel && (
                      <span className='text-muted-foreground shrink-0 text-[10px]'>
                        {timeLabel}
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate'>
                    <span className='font-mono font-semibold'>#{conversation.bookingCode}</span>
                    <span className='text-muted-foreground/60'>•</span>
                    <span className='text-muted-foreground truncate'>{conversation.workspaceName}</span>
                  </div>

                  <p className='text-muted-foreground line-clamp-1 text-xs mt-0.5'>
                    {conversation.lastMessagePreview || 'Chưa có tin nhắn'}
                  </p>
                </div>

                {/* Unread badge */}
                {conversation.unreadCount > 0 && (
                  <span className='bg-gradient-to-r from-indigo-600 to-violet-600 text-white ml-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] px-1 items-center justify-center rounded-full text-[0.65rem] font-bold shadow-xs shrink-0 self-center'>
                    {conversation.unreadCount}
                  </span>
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
