import { Bot, User } from 'lucide-react';
import type { ChatUiMessage } from '../api/types';
import { QuickSuggestions } from './quick-suggestions';

interface ChatMessageItemProps {
  message: ChatUiMessage;
  onSelectSuggestion: (question: string) => void;
  disabledSuggestions?: boolean;
}

/**
 * Format markdown văn bản cơ bản (in đậm, danh sách gạch đầu dòng, tiêu đề, link)
 */
function renderFormattedContent(text: string) {
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

    // Phân tích bold text (**...**) và markdown link ([text](url))
    const parts = displayLine.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

    const renderedParts = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIdx} className='font-semibold text-foreground'>
            {part.slice(2, -2)}
          </strong>
        );
      }
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <a
            key={partIdx}
            href={linkMatch[2]}
            className='text-primary underline underline-offset-2 hover:opacity-80 font-medium'
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
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
  const isBot = message.role === 'assistant';

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
          {renderFormattedContent(message.content)}
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
