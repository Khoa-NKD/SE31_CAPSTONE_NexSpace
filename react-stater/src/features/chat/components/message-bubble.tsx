import { motion, useReducedMotion } from 'motion/react';
import { Check, CheckCheck, Paperclip, Sparkles, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { BookingChatMessageDto } from '../api/types';

interface MessageBubbleProps {
  message: BookingChatMessageDto;
  currentUserId?: number;
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
              ? 'bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30'
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
              ? 'bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30'
              : isAi
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
              : 'bg-muted text-foreground border border-border/60'
          )}
        >
          {backtickMatch[1]}
        </code>
      );
    }

    // Strip any other stray HTML tags (e.g. <br>, <b>)
    const cleanText = part.replace(/<[^>]+>/g, '');
    return <span key={index}>{cleanText}</span>;
  });
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const isAi =
    message.messageType === 'AI_ASSISTANT' ||
    message.senderRole === 'AI_ASSISTANT' ||
    message.senderName?.includes('NexSpace AI');
  const isMe = !isAi && currentUserId ? message.senderId === currentUserId : false;

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
      aria-label={`${isAi ? 'NexSpace AI' : message.senderName} lúc ${timeStr}`}
    >
      {!isMe && (
        isAi ? (
          <div className='h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0 mb-0.5 shadow-xs ring-1 ring-purple-500/30'>
            <Sparkles className='h-3.5 w-3.5 animate-pulse' />
          </div>
        ) : (
          <Avatar className='h-7 w-7 border border-border/60 shrink-0 mb-0.5 rounded-xl'>
            <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
            <AvatarFallback className='text-[10px] bg-muted font-bold rounded-xl'>
              {message.senderName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )
      )}

      <div className={cn('max-w-[85%] sm:max-w-[75%] space-y-1', isMe && 'ml-auto')}>
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
            <p className='text-[11px] text-muted-foreground font-medium pl-1'>
              {message.senderName}
            </p>
          )
        )}

        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs',
            isMe
              ? 'border-primary/40 bg-primary text-primary-foreground rounded-br-xs'
              : isAi
              ? 'border border-purple-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-card text-foreground rounded-bl-xs shadow-xs'
              : 'bg-card text-foreground border border-border/80 rounded-bl-xs'
          )}
        >
          {renderMessageContent(message.content, isMe, isAi)}

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
          {isAi && (
            <span className='text-[9px] text-purple-500/80 font-medium ml-1'>• Trả lời tự động</span>
          )}
          {isMe && (
            message.isRead ? (
              <span title='Đã đọc' className='text-emerald-500 flex items-center'>
                <CheckCheck className='h-3 w-3' />
              </span>
            ) : (
              <span title='Đã gửi' className='text-muted-foreground/60 flex items-center'>
                <Check className='h-3 w-3' />
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
