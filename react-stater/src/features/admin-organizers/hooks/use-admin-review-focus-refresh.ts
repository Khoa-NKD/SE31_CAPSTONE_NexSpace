import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateLifecycle } from '@/features/organizer-lifecycle/api/lifecycle';

/** Query's visibility listener does not cover returning to a separate, already-visible browser window. */
export function useAdminReviewFocusRefresh(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void invalidateLifecycle(client);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [client, enabled]);
}
