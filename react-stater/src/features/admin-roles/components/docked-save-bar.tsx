import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface DockedSaveBarProps {
  modifiedKeys: string[];
  onDiscard: () => void;
  onSave: () => void;
}

export function DockedSaveBar({ modifiedKeys, onDiscard, onSave }: DockedSaveBarProps) {
  if (modifiedKeys.length === 0) return null;

  return (
    <div className='bg-muted/95 border-t border-border p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20 backdrop-blur-md rounded-b-xl shadow-lg animate-in slide-in-from-bottom-2 duration-150'>
      {/* Left: Status Notification Pill */}
      <div className='flex items-center gap-2.5'>
        <div className='relative flex h-2.5 w-2.5'>
          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75'></span>
          <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500'></span>
        </div>
        <span className='text-xs font-medium text-foreground'>
          <strong className='text-amber-700 dark:text-amber-400 font-bold'>
            {modifiedKeys.length} {modifiedKeys.length === 1 ? 'permission' : 'permissions'} modified
          </strong>{' '}
          in current session:{' '}
          <span className='inline-flex flex-wrap gap-1 mt-0.5 sm:mt-0'>
            {modifiedKeys.slice(0, 3).map((key) => (
              <code
                key={key}
                className='bg-card px-1.5 py-0.5 rounded text-[11px] font-mono border border-border text-foreground'
              >
                {key}
              </code>
            ))}
            {modifiedKeys.length > 3 && (
              <span className='text-muted-foreground text-[11px]'>+{modifiedKeys.length - 3} more</span>
            )}
          </span>
        </span>
      </div>

      {/* Right: Action Buttons */}
      <div className='flex items-center gap-3 shrink-0'>
        <Button
          variant='outline'
          size='sm'
          onClick={onDiscard}
          className='text-xs font-semibold'
        >
          Discard Changes
        </Button>
        <Button
          size='sm'
          onClick={onSave}
          className='bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-1.5'
        >
          <CheckCircle2 className='size-3.5' />
          <span>Save &amp; Apply Permissions</span>
        </Button>
      </div>
    </div>
  );
}
