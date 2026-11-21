import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingConversationDto } from '../api/types';

interface ConversationSelectProps {
  conversations: BookingConversationDto[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isConnected?: boolean;
  isCustomer?: boolean;
}

export function ConversationSelect({
  conversations,
  selectedId,
  onSelect,
  isConnected = false,
  isCustomer = false
}: ConversationSelectProps) {
  return (
    <div className='border-border/40 bg-background/75 flex flex-col gap-2.5 rounded-2xl border p-3 backdrop-blur lg:hidden'>
      <div className='flex items-center justify-between gap-2 sm:gap-3'>
        <div>
          <p className='text-foreground text-xs font-semibold sm:text-sm'>Hội thoại & Hỗ trợ</p>
          <p className='text-muted-foreground text-[0.65rem] sm:text-xs'>
            {conversations.length} cuộc hội thoại
          </p>
        </div>
        <Badge
          variant='outline'
          className={cn(
            'border-border/50 rounded-full border px-2 py-0.5 text-[0.65rem] tracking-[0.2em] uppercase font-semibold flex items-center gap-1',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-muted/50 text-muted-foreground'
          )}
        >
          <Radio className={cn('h-2 w-2', isConnected && 'animate-pulse text-emerald-500')} />
          <span>{isConnected ? 'Trực tuyến' : 'Đang kết nối'}</span>
        </Badge>
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='messenger-conversation'
          className='text-muted-foreground text-[0.65rem] font-medium sm:text-xs'
        >
          Chọn cuộc trò chuyện:
        </label>
        <select
          id='messenger-conversation'
          value={selectedId ?? ''}
          onChange={(e) => onSelect(Number(e.target.value))}
          className='border-border/40 bg-background/70 text-foreground focus:border-primary/40 focus:ring-primary/30 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:ring-2 focus:outline-none sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm'
        >
          {conversations.map((conversation) => {
            const displayName = isCustomer ? conversation.organizerName : conversation.customerName;
            return (
              <option key={conversation.id} value={conversation.id}>
                [#{conversation.bookingCode}] {displayName} - {conversation.workspaceName}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
