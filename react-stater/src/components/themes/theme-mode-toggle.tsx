import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ThemeModeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeModeToggle({ className, compact = false }: ThemeModeToggleProps = {}) {
  const { setTheme, resolvedTheme } = useTheme();

  const handleThemeToggle = React.useCallback(
    (e?: React.MouseEvent) => {
      const newMode = resolvedTheme === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;

      if (!document.startViewTransition) {
        setTheme(newMode);
        return;
      }

      // Set coordinates from the click event for ripple transition
      if (e) {
        root.style.setProperty('--x', `${e.clientX}px`);
        root.style.setProperty('--y', `${e.clientY}px`);
      }

      document.startViewTransition(() => {
        setTheme(newMode);
      });
    },
    [resolvedTheme, setTheme]
  );

  const isDark = resolvedTheme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          type='button'
          aria-label='Toggle theme mode'
          className={cn(
            'group/toggle cursor-pointer text-foreground transition-all duration-200 active:scale-95',
            compact
              ? 'size-7 rounded-full p-0 hover:bg-muted/80'
              : 'size-9 rounded-xl border border-border/80 bg-background/80 shadow-2xs hover:scale-105 hover:border-indigo-400/50 hover:bg-muted/90',
            className
          )}
          onClick={handleThemeToggle}
        >
          {isDark ? (
            <Sun
              className={cn(
                'text-amber-400 transition-transform duration-300 group-hover:rotate-45',
                compact ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'
              )}
            />
          ) : (
            <Moon
              className={cn(
                'text-slate-700 transition-transform duration-300 group-hover:-rotate-12 dark:text-slate-200',
                compact ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'
              )}
            />
          )}
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom' className='text-xs font-medium'>
        {isDark ? 'Chuyển sang nền sáng (Light)' : 'Chuyển sang nền tối (Dark)'}
      </TooltipContent>
    </Tooltip>
  );
}
