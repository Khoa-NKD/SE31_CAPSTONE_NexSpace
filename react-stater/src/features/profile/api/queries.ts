import { queryOptions } from '@tanstack/react-query';
import { userProfileService } from './service';

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const
};

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: profileKeys.me(),
    queryFn: () => userProfileService.getMyProfile(),
    staleTime: 1000 * 60 * 5 // 5 phút cache
  });

