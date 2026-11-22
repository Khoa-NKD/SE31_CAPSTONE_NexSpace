import { Spinner as Loader2 } from '@/components/ui/spinner';
import { FormEvent, useRef } from 'react';
import {
  Send,
  Sparkles,
  RefreshCw,
  Wand2,
  Globe2,
  Zap,
  HeartHandshake
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import type { AiToneMode } from '../api/types';

interface MessageComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => void;
  contactName: string;
  isSending?: boolean;
  smartReplies?: string[];
  isLoadingSmartReplies?: boolean;
  onRefreshSmartReplies?: () => void;
  onAdjustTone?: (mode: AiToneMode) => void;
  isAdjustingTone?: boolean;
  isCustomer?: boolean;
  onSummarize?: () => void;
  isSummarizing?: boolean;
}

const DEFAULT_QUICK_REPLIES = [
  'Xin chào! NexSpace có thể hỗ trợ gì cho bạn?',
  'Mã PIN cửa check-in của bạn đã sẵn sàng.',
  'Không gian làm việc đã chuẩn bị xong, chào mừng bạn!',
  'Bạn có cần hướng dẫn đường đi tới toà nhà không?'
];

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  contactName,
  isSending = false,
  smartReplies = DEFAULT_QUICK_REPLIES,
  isLoadingSmartReplies = false,
  onRefreshSmartReplies,
  onAdjustTone,
  isAdjustingTone = false,
  isCustomer = false,
  onSummarize,
  isSummarizing = false
}: MessageComposerProps) {
  const isComposingRef = useRef(false);

  const handleSubmit = (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!draft.trim() || isSending) return;
    onSubmit(e);
  };

  const handleToneClick = (mode: AiToneMode) => {
    if (!draft.trim()) {
      toast.info('Vui lòng nhập tin nhắn vào ô soạn thảo trước khi nhờ AI hỗ trợ');
      return;
    }
    if (onAdjustTone) {
      onAdjustTone(mode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2 shrink-0' aria-label='Khung soạn thảo'>
      {/* Quick AI & Smart Action Bar */}
      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none'>
        {isCustomer ? (
          // Khách hàng: Gợi ý các câu hỏi trực tiếp cho @NexSpace AI
          <>
            <Badge
              variant='outline'
              className='bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25 text-[11px] font-medium gap-1 px-2.5 py-0.5 shrink-0 shadow-2xs'
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
                onClick={() => onDraftChange(prompt)}
                className='border-border/50 bg-background/80 hover:border-purple-500/50 hover:bg-purple-500/5 text-foreground rounded-full border px-3 py-1 text-xs transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95'
                title='Nhấn để điền câu hỏi cho AI'
              >
                {prompt}
              </button>
            ))}
          </>
        ) : (
          // Chủ không gian: Gợi ý tổng hợp chat hoặc smart replies
          <>
            {onSummarize && (
              <button
                type='button'
                onClick={onSummarize}
                disabled={isSummarizing}
                className='border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 rounded-full border px-2.5 py-1 text-xs font-medium transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95 flex items-center gap-1.5'
                title='Yêu cầu AI tóm tắt nội dung cuộc trò chuyện (Chỉ riêng bạn thấy)'
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className='h-3 w-3 text-purple-500' />
                    <span>Đang tổng hợp...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className='h-3 w-3 text-purple-500' />
                    <span>✨ Tổng hợp đoạn chat</span>
                  </>
                )}
              </button>
            )}

            {isLoadingSmartReplies ? (
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground py-0.5 px-2 animate-pulse'>
                <Loader2 className='h-3 w-3 text-primary' />
                <span className='text-[11px]'>NexSpace AI đang phân tích đơn...</span>
              </div>
            ) : (
              smartReplies.map((reply) => {
                const cleanReply = reply.replace(/<\/?code>/gi, "'").replace(/<[^>]+>/g, '');
                return (
                  <button
                    key={reply}
                    type='button'
                    onClick={() => onDraftChange(cleanReply)}
                    className='border-border/60 bg-card text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-full border px-3 py-1 text-xs transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95 max-w-[280px] sm:max-w-[360px] truncate'
                    title={cleanReply}
                  >
                    {cleanReply}
                  </button>
                );
              })
            )}

            {onRefreshSmartReplies && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={onRefreshSmartReplies}
                disabled={isLoadingSmartReplies}
                className='h-6 w-6 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-0.5'
                title='Làm mới gợi ý AI'
                aria-label='Làm mới gợi ý AI'
              >
                <RefreshCw className={cn('h-3 w-3', isLoadingSmartReplies && 'animate-spin')} />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Main Composer Box */}
      <div className='border-border/60 bg-card/70 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all flex items-end gap-2 rounded-2xl border p-2.5 backdrop-blur-xs sm:gap-3 sm:rounded-2xl sm:p-3'>
        {/* Nút bấm nhanh @AI - Chỉ hiển thị cho khách hàng */}
        {isCustomer && (
          <Button
            type='button'
            variant='ghost'
            onClick={() => {
              onDraftChange(draft.startsWith('@NexSpace AI ') ? draft : `@NexSpace AI ${draft}`);
            }}
            className='size-8 sm:size-9 rounded-full border border-purple-500/25 bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 shrink-0 cursor-pointer transition flex items-center justify-center font-bold text-xs'
            title='Nhắc @NexSpace AI để hỏi thông tin'
            aria-label='Nhắc @NexSpace AI'
          >
            <Sparkles className='h-3.5 w-3.5 text-purple-500' />
          </Button>
        )}

        <div className='min-w-0 flex-1'>
          <label htmlFor='messenger-editor' className='sr-only'>
            Nhập tin nhắn
          </label>
          <Textarea
            id='messenger-editor'
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              onDraftChange(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              // Chống gửi khi đang gõ tiếng Việt (Telex/VNI IME)
              if (e.nativeEvent.isComposing || isComposingRef.current || e.keyCode === 229) {
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              isCustomer ? 'Nhắn tin hoặc tag @NexSpace AI để hỏi...' : `Nhắn cho ${contactName}...`
            }
            rows={1}
            className='text-foreground placeholder:text-muted-foreground/70 min-h-[2.5rem] max-h-32 w-full resize-none border-none bg-transparent text-xs sm:text-sm focus-visible:ring-0 focus-visible:outline-none p-1'
            aria-label={`Nhắn cho ${contactName}`}
          />
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          {/* AI Tone & Writing Assistant Dropdown */}
          {onAdjustTone && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={isAdjustingTone}
                  className={cn(
                    'size-8 sm:size-9 rounded-full border border-indigo-500/25 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 transition cursor-pointer',
                    isAdjustingTone && 'animate-pulse'
                  )}
                  title='Trợ lý AI tinh chỉnh văn phong'
                  aria-label='Trợ lý AI'
                >
                  {isAdjustingTone ? (
                    <Loader2 className='h-4 w-4 text-primary' />
                  ) : (
                    <Wand2 className='h-4 w-4 text-primary' />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                side='top'
                className='w-56 p-1.5 shadow-xl rounded-2xl'
              >
                <DropdownMenuLabel className='text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1.5'>
                  <Sparkles className='h-3.5 w-3.5 text-primary' />
                  <span>
                    {isCustomer ? 'Trợ lý AI cho Khách hàng' : 'Trợ lý AI cho Chủ không gian'}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleToneClick('POLITE')}
                  className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
                >
                  <HeartHandshake className='h-4 w-4 text-rose-500 shrink-0' />
                  <div>
                    <p className='font-semibold'>
                      {isCustomer ? 'Lịch sự & Lễ phép' : 'Lịch sự & Hiếu khách'}
                    </p>
                    <p className='text-[10px] text-muted-foreground'>
                      {isCustomer
                        ? 'Hỏi thăm, nhờ hỗ trợ lịch sự và tôn trọng'
                        : 'Thân thiện, tôn trọng và hiếu khách'}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToneClick('CONCISE')}
                  className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
                >
                  <Zap className='h-4 w-4 text-amber-500 shrink-0' />
                  <div>
                    <p className='font-semibold'>Rút gọn súc tích</p>
                    <p className='text-[10px] text-muted-foreground'>
                      {isCustomer
                        ? 'Đi thẳng vào thắc mắc cần giải đáp'
                        : 'Ngắn gọn, đi thẳng vào trọng tâm'}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleToneClick('TRANSLATE_EN')}
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
                  onClick={() => handleToneClick('TRANSLATE_VI')}
                  className='text-xs gap-2.5 py-2 cursor-pointer rounded-xl'
                >
                  <Globe2 className='h-4 w-4 text-emerald-500 shrink-0' />
                  <div>
                    <p className='font-semibold'>Dịch sang Tiếng Việt</p>
                    <p className='text-[10px] text-muted-foreground'>
                      Tiếng Việt tự nhiên chuẩn mực
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Send Button */}
          <Button
            type='submit'
            size='icon'
            className='bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 active:scale-95 size-8 sm:size-9 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            disabled={!draft.trim() || isSending}
            aria-label='Gửi tin nhắn'
          >
            {isSending ? (
              <Loader2 className='h-4 w-4 ' />
            ) : (
              <Send className='h-3.5 w-3.5 sm:h-4 sm:w-4' aria-hidden='true' />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
