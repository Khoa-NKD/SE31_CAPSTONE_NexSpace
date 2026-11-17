import { queryOptions } from '@tanstack/react-query';
import { customerPreferenceService } from './service';

export const customerPreferenceKeys = {
  all: ['customer-preferences'] as const,
  me: () => [...customerPreferenceKeys.all, 'me'] as const
};

export function customerPreferenceQueryOptions() {
  return queryOptions({
    queryKey: customerPreferenceKeys.me(),
    queryFn: () => customerPreferenceService.getMyPreferences(),
    staleTime: 5 * 60 * 1000 // 5 phút cache
  });
}

