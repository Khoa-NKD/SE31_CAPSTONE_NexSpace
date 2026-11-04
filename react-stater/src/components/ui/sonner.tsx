'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from 'lucide-react';
import { useTheme } from '@/components/themes/theme-provider';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position='top-right'
      closeButton
      className='toaster group'
      icons={{
        success: <CircleCheckIcon className='size-5 text-emerald-100 shrink-0 stroke-[2.2]' />,
        info: <InfoIcon className='size-5 text-indigo-100 shrink-0 stroke-[2.2]' />,
        warning: <TriangleAlertIcon className='size-5 text-amber-100 shrink-0 stroke-[2.2]' />,
        error: <OctagonXIcon className='size-5 text-white shrink-0 stroke-[2.2]' />,
        loading: <Loader2Icon className='size-5 text-white/80 shrink-0 animate-spin' />
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast font-sans rounded-xl shadow-2xl border px-4 py-3.5 flex items-center gap-3 text-sm font-semibold tracking-normal transition-all duration-300',
          title: 'text-sm font-semibold',
          description: 'text-xs opacity-90 font-normal',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error:
            '!bg-gradient-to-r !from-red-600 !to-rose-600 !text-white !border-red-500/80 !shadow-lg !shadow-red-500/25 dark:!from-red-700 dark:!to-rose-700 [&_[data-close-button]]:!text-white [&_[data-close-button]]:!bg-red-700/60 [&_[data-close-button]]:hover:!bg-red-800',
          success:
            '!bg-gradient-to-r !from-emerald-600 !to-teal-600 !text-white !border-emerald-500/80 !shadow-lg !shadow-emerald-500/25 dark:!from-emerald-700 dark:!to-teal-700 [&_[data-close-button]]:!text-white [&_[data-close-button]]:!bg-emerald-700/60',
          warning:
            '!bg-gradient-to-r !from-amber-500 !to-orange-500 !text-white !border-amber-400/80 !shadow-lg !shadow-amber-500/25',
          info:
            '!bg-gradient-to-r !from-indigo-600 !to-blue-600 !text-white !border-indigo-500/80 !shadow-lg !shadow-indigo-500/25'
        }
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)'
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
