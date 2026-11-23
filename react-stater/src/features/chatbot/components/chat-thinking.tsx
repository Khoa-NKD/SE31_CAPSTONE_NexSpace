import { Spinner } from '@/components/ui/spinner';

/** Mounted only while a request is pending; keep the status text accessible. */
export function ChatThinking() {
  return (
    <div className='flex items-center gap-2 px-2 text-xs text-muted-foreground' role='status'>
      <Spinner className='h-7 w-9 text-primary' aria-hidden='true' />
      <span>NexBot đang suy nghĩ…</span>
    </div>
  );
}
