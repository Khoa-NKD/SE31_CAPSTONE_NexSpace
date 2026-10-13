import { useCommandMenu } from '@/components/command-menu';
import { Icons } from '@/components/icons';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  className?: string;
}

export default function SearchInput({ className }: SearchInputProps) {
  const { toggle } = useCommandMenu();
  return (
    <div className={cn('w-full', className)}>
      <Button
        variant='outline'
        type='button'
        className='bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border/80 relative h-9 w-full justify-start rounded-lg text-xs font-normal shadow-none transition-colors px-3 sm:pr-12'
        onClick={toggle}
      >
        <Icons.search className='mr-2 size-3.5 shrink-0 text-muted-foreground' />
        <span className='truncate hidden sm:inline'>Search console, users, roles...</span>
        <span className='truncate sm:hidden'>Search...</span>
        <kbd className='bg-muted/80 pointer-events-none absolute top-[0.35rem] right-[0.35rem] hidden h-5 items-center gap-0.5 rounded border border-border px-1.5 font-mono text-[10px] font-medium opacity-90 select-none sm:flex'>
          <span className='text-[10px]'>⌘</span>K
        </kbd>
      </Button>
    </div>
  );
}
