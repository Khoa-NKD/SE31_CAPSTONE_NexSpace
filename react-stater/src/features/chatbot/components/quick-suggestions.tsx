import { Sparkles } from '@/components/ui/hugeicons';

interface QuickSuggestionsProps {
  suggestions?: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function QuickSuggestions({ suggestions, onSelect, disabled }: QuickSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-1.5 pt-2'>
      {suggestions.map((q, idx) => (
        <button
          key={idx}
          type='button'
          disabled={disabled}
          onClick={() => onSelect(q)}
          className='inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 hover:border-primary/40 disabled:opacity-50 disabled:pointer-events-none text-left'
        >
          <Sparkles className='h-3 w-3 shrink-0 text-primary' />
          <span>{q}</span>
        </button>
      ))}
    </div>
  );
}
