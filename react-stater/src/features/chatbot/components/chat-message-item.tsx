import { Bot, User, ExternalLink } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import type { ChatUiMessage } from '../api/types';
import { QuickSuggestions } from './quick-suggestions';

interface ChatMessageItemProps {
  message: ChatUiMessage;
  onSelectSuggestion: (question: string) => void;
  disabledSuggestions?: boolean;
}

function cleanLinkLabel(rawLabel: string) {
  const trimmed = rawLabel.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'tại đây' || lower === 'nhấn vào đây') return trimmed;
  if (lower.includes('tại đây')) return 'Tại đây';
  if (
    lower.includes('nhấn vào đây') ||
    lower.includes('bấm vào đây') ||
    lower.includes('click vào đây')
  ) {
    return 'Nhấn vào đây';
  }
  return trimmed;
}

/**
 * Format markdown văn bản cơ bản (in đậm, danh sách gạch đầu dòng, tiêu đề, link)
 */
function renderFormattedContent(text: string, onNavigate: (url: string) => void) {
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Tiêu đề
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIdx} className='font-semibold text-foreground text-sm mt-1.5 mb-1'>
          {line.replace('### ', '')}
        </h4>
      );
    }

    // Danh sách gạch đầu dòng
    const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
    const displayLine = isBullet ? line.trim().substring(2) : line;

    // Phân tích markdown link [label](url) trước, tách các segments
    const segments = displayLine.split(/(\[[^\]]+\]\([^)]+\))/g);

    // Xóa bỏ các cặp ** bao quanh bên ngoài link nếu có (ví dụ: **[label](url)**)
    for (let i = 1; i < segments.length; i += 2) {
      if (segments[i - 1].endsWith('**') && segments[i + 1].startsWith('**')) {
        segments[i - 1] = segments[i - 1].slice(0, -2);
        segments[i + 1] = segments[i + 1].slice(2);
      }
    }

    const renderedParts: React.ReactNode[] = [];

    segments.forEach((seg, sIdx) => {
      const linkMatch = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const rawLabel = linkMatch[1];
        const url = linkMatch[2];
        const cleanedLabel = cleanLinkLabel(rawLabel);
        const isShortCallToAction =
          cleanedLabel.toLowerCase() === 'nhấn vào đây' || cleanedLabel.toLowerCase() === 'tại đây';

        // Nếu rawLabel không phải cụm "Nhấn vào đây" / "Tại đây" (ví dụ là tên chỗ ngồi cũ trong history)
        if (!isShortCallToAction) {
          renderedParts.push(
            <span key={`link-${sIdx}`} className='inline-flex items-center gap-1 flex-wrap'>
              <span className='font-semibold text-foreground'>{rawLabel}</span>
              <span className='text-muted-foreground text-xs'>👉</span>
              <a
                href={url}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(url);
                }}
                className='font-semibold text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer inline-flex items-center gap-0.5'
                title={url}
              >
                Nhấn vào đây
                <ExternalLink className='h-3 w-3 inline ml-0.5 shrink-0' />
              </a>
            </span>
          );
        } else {
          renderedParts.push(
            <a
              key={`link-${sIdx}`}
              href={url}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(url);
              }}
              className='font-semibold text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer inline-flex items-center gap-0.5'
              title={url}
            >
              {cleanedLabel}
              <ExternalLink className='h-3 w-3 inline ml-0.5 shrink-0' />
            </a>
          );
        }
      } else {
        // Phân tích bold **...** trong đoạn text thông thường
        const boldParts = seg.split(/(\*\*.*?\*\*)/g);
        boldParts.forEach((bp, bpIdx) => {
          if (bp.startsWith('**') && bp.endsWith('**') && bp.length >= 4) {
            renderedParts.push(
              <strong key={`bold-${sIdx}-${bpIdx}`} className='font-semibold text-foreground'>
                {bp.slice(2, -2)}
              </strong>
            );
          } else if (bp) {
            renderedParts.push(
              <span key={`text-${sIdx}-${bpIdx}`}>{bp}</span>
            );
          }
        });
      }
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className='flex items-start gap-1.5 my-0.5 pl-1'>
          <span className='text-primary mt-1 text-xs'>•</span>
          <span className='flex-1'>{renderedParts}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={lineIdx} className='h-1.5' />;
    }

    return (
      <p key={lineIdx} className='my-0.5 leading-relaxed'>
        {renderedParts}
      </p>
    );
  });
}

export function ChatMessageItem({
  message,
  onSelectSuggestion,
  disabledSuggestions
}: ChatMessageItemProps) {
  const router = useRouter();
  const isBot = message.role === 'assistant';

  const handleNavigate = (url: string) => {
    if (!url) return;
    if (url.startsWith('/')) {
      const [pathname, searchStr] = url.split('?');
      if (searchStr) {
        const searchObj: Record<string, string> = {};
        const params = new URLSearchParams(searchStr);
        params.forEach((value, key) => {
          searchObj[key] = value;
        });
        void router.navigate({
          to: pathname as never,
          search: searchObj as never
        });
      } else {
        void router.navigate({
          to: pathname as never
        });
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`flex w-full gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className='flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs'>
          <Bot className='h-4 w-4' />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isBot ? 'items-start' : 'items-end'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs break-words ${
            isBot
              ? 'bg-muted/70 text-foreground border border-border/40 rounded-tl-xs'
              : 'bg-primary text-primary-foreground rounded-tr-xs'
          }`}
        >
          {renderFormattedContent(message.content, handleNavigate)}
        </div>

        {isBot && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
          <QuickSuggestions
            suggestions={message.suggestedQuestions}
            onSelect={onSelectSuggestion}
            disabled={disabledSuggestions}
          />
        )}

        <span className='text-[10px] text-muted-foreground/70 px-1 mt-1'>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {!isBot && (
        <div className='flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border shadow-xs'>
          <User className='h-4 w-4' />
        </div>
      )}
    </div>
  );
}
