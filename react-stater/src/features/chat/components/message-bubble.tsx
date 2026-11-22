import { motion, useReducedMotion } from 'motion/react';
import { Check, CheckCheck, Paperclip } from '@/components/ui/hugeicons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { BookingChatMessageDto } from '../api/types';

interface MessageBubbleProps {
  message: BookingChatMessageDto;
  currentUserId?: number;
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const isMe = currentUserId ? message.senderId === currentUserId : false;

  const timeStr = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}
      role='group'
      aria-label={`${message.senderName} lúc ${timeStr}`}
    >
      {!isMe && (
        <Avatar className='h-7 w-7 border border-border/60 shrink-0 mb-0.5 rounded-xl'>
          <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
          <AvatarFallback className='text-[10px] bg-muted font-bold rounded-xl'>
            {message.senderName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('max-w-[85%] sm:max-w-[75%] space-y-1', isMe && 'ml-auto')}>
        {!isMe && (
          <p className='text-[11px] text-muted-foreground font-medium pl-1'>{message.senderName}</p>
        )}

        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs',
            isMe
              ? 'border-primary/40 bg-primary text-primary-foreground rounded-br-xs'
              : 'bg-card text-foreground border border-border/80 rounded-bl-xs'
          )}
        >
          {message.content}

          {message.attachmentUrl && (
            <div className='mt-2 pt-2 border-t border-current/20'>
              <a
                href={message.attachmentUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1.5 text-xs underline font-medium hover:opacity-80'
              >
                <Paperclip className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{message.attachmentName || 'Tệp đính kèm'}</span>
              </a>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-1 text-[10px] text-muted-foreground/70',
            isMe ? 'justify-end pr-1' : 'pl-1'
          )}
        >
          <span>{timeStr}</span>
          {isMe &&
            (message.isRead ? (
              <span title='Đã đọc' className='text-emerald-500 flex items-center'>
                <CheckCheck className='h-3 w-3' />
              </span>
            ) : (
              <span title='Đã gửi' className='text-muted-foreground/60 flex items-center'>
                <Check className='h-3 w-3' />
              </span>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
