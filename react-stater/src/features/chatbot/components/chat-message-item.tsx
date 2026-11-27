import type { ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Bot, User, ExternalLink } from '@/components/ui/hugeicons';
import type { ChatUiMessage } from '../api/types';
import { QuickSuggestions } from './quick-suggestions';

interface ChatMessageItemProps {
  message: ChatUiMessage;
  onSelectSuggestion: (question: string) => void;
  disabledSuggestions?: boolean;
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  return /^https?:\/\//i.test(trimmed);
}

function renderInlineFormatting(text: string, onNavigate: (url: string) => void, isBot: boolean): ReactNode[] {
  const segments = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  for (let i = 1; i < segments.length; i += 2) {
    if (segments[i - 1].endsWith('**') && segments[i + 1].endsWith('**')) {
      segments[i - 1] = segments[i - 1].slice(0, -2);
      segments[i + 1] = segments[i + 1].slice(2);
    }
  }

  const parts: ReactNode[] = [];

  segments.forEach((seg, sIdx) => {
    const linkMatch = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch && isSafeUrl(linkMatch[2])) {
      const label = linkMatch[1].trim();
      const url = linkMatch[2].trim();
      parts.push(
        <a
          key={`link-${sIdx}`}
          href={url}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(url);
          }}
          className={`inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer ${
            isBot ? 'text-primary' : 'text-primary-foreground'
          }`}
          title={url}
        >
          <span>{label}</span>
          <ExternalLink className='h-3 w-3 inline shrink-0' />
        </a>
      );
      return;
    }

    const tokenParts = seg.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    tokenParts.forEach((tp, tpIdx) => {
      if (tp.startsWith('**') && tp.endsWith('**') && tp.length >= 4) {
        parts.push(
          <strong key={`bold-${sIdx}-${tpIdx}`} className={isBot ? 'font-semibold text-foreground' : 'font-semibold'}>
            {tp.slice(2, -2)}
          </strong>
        );
      } else if (tp.startsWith('`') && tp.endsWith('`') && tp.length >= 2) {
        parts.push(
          <code
            key={`code-${sIdx}-${tpIdx}`}
            className={`rounded px-1 py-0.2 font-mono text-[11px] font-medium ${
              isBot ? 'bg-background/80 text-foreground border border-border/50' : 'bg-primary-foreground/15 text-primary-foreground'
            }`}
          >
            {tp.slice(1, -1)}
          </code>
        );
      } else if (tp) {
        parts.push(<span key={`text-${sIdx}-${tpIdx}`}>{tp}</span>);
      }
    });
  });

  return parts;
}

/**
 * Format markdown phản hồi của NexBot (tiêu đề, danh sách đánh số, gạch đầu dòng, code inline, link).
 */
function renderFormattedContent(text: string, onNavigate: (url: string) => void, isBot: boolean) {
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      const titleText = trimmed.replace(/^#{2,3}\s+/, '');
      return (
        <h4 key={lineIdx} className={`font-semibold text-sm mt-1.5 mb-1 ${isBot ? 'text-foreground' : ''}`}>
          {renderInlineFormatting(titleText, onNavigate, isBot)}
        </h4>
      );
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return (
        <div key={lineIdx} className='flex items-start gap-2 my-1'>
          <span
            className={`mt-0.5 inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
              isBot ? 'bg-primary/15 text-primary' : 'bg-primary-foreground/20 text-primary-foreground'
            }`}
          >
            {numberedMatch[1]}
          </span>
          <span className='flex-1 leading-relaxed'>
            {renderInlineFormatting(numberedMatch[2], onNavigate, isBot)}
          </span>
        </div>
      );
    }

    const bulletMatch = trimmed.match(/^(?:\*|-|\+)\s+(.*)$/);
    if (bulletMatch) {
      return (
        <div key={lineIdx} className='flex items-start gap-1.5 my-0.5 pl-1'>
          <span className={`mt-0.5 text-xs ${isBot ? 'text-primary' : ''}`}>•</span>
          <span className='flex-1 leading-relaxed'>
            {renderInlineFormatting(bulletMatch[1], onNavigate, isBot)}
          </span>
        </div>
      );
    }

    if (!trimmed) {
      return <div key={lineIdx} className='h-1.5' />;
    }

    return (
      <p key={lineIdx} className='my-0.5 leading-relaxed'>
        {renderInlineFormatting(line, onNavigate, isBot)}
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
    if (!url || !isSafeUrl(url)) return;
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
          {renderFormattedContent(message.content, handleNavigate, isBot)}
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
