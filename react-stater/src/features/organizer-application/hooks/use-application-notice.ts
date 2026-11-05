import { useEffect, useId, useRef } from 'react';
import { toast } from 'sonner';
import { useOrganizerTranslation } from './use-organizer-translation';

/** Publish operation results after the loading state has committed, using the shared site toaster. */
export function useApplicationNotice(success: string, error: string, busy: boolean) {
  const tr = useOrganizerTranslation();
  const id = useId();
  const shown = useRef('');
  useEffect(() => {
    if (!success && !error) {
      shown.current = '';
      return;
    }
    if (busy) return;
    const message = error || success;
    const key = `${error ? 'error' : 'success'}:${message}`;
    if (shown.current === key) return;
    shown.current = key;
    if (error) toast.error(tr(message), { id });
    else toast.success(tr(message), { id });
  }, [success, error, busy, tr, id]);
}
