import { Spinner as Loader2 } from '@/components/ui/spinner';
import { FormEvent, useRef } from 'react';
import { Send, Sparkles } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => void;
  contactName: string;
  isSending?: boolean;
  quickReplies?: string[];
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
  quickReplies = DEFAULT_QUICK_REPLIES
}: MessageComposerProps) {
  const isComposingRef = useRef(false);

  const handleSubmit = (e?: FormEvent<HTMLFormElement> | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!draft.trim() || isSending) return;
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2 shrink-0' aria-label='Khung soạn thảo'>
      {/* Quick Replies */}
      {quickReplies && quickReplies.length > 0 && (
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none'>
          <div className='flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 mr-1'>
            <Sparkles className='h-3 w-3 text-primary' />
            <span className='hidden sm:inline'>Mẫu nhanh:</span>
          </div>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type='button'
              onClick={() => {
                onDraftChange(reply);
              }}
              className='border-border/50 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/40 rounded-full border px-2.5 py-0.5 text-[11px] transition shrink-0 cursor-pointer shadow-2xs whitespace-nowrap'
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className='border-border/40 bg-background/80 flex items-end gap-2 rounded-2xl border p-2.5 backdrop-blur sm:gap-3 sm:rounded-3xl sm:p-3'>
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
            placeholder={`Nhắn cho ${contactName} (Nhấn Enter để gửi, Shift+Enter xuống dòng)...`}
            rows={1}
            className='text-foreground placeholder:text-muted-foreground/70 min-h-[2.5rem] max-h-32 w-full resize-none border-none bg-transparent text-xs sm:text-sm focus-visible:ring-0 focus-visible:outline-none p-1'
            aria-label={`Nhắn cho ${contactName}`}
          />
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          <Button
            type='submit'
            size='icon'
            className='bg-primary text-primary-foreground hover:bg-primary/90 size-8 sm:size-9 rounded-full shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
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
