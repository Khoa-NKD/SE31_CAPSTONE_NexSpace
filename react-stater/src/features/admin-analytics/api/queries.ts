import { queryOptions } from '@tanstack/react-query';
import { adminAnalyticsService } from './service';

export const adminAnalyticsKeys = {
  all: ['admin-platform-analytics'] as const,
  detail: (range: string) => [...adminAnalyticsKeys.all, range] as const
};

export const adminPlatformAnalyticsQueryOptions = (timeRange: string = '30D') =>
  queryOptions({
    queryKey: adminAnalyticsKeys.detail(timeRange),
    queryFn: () => adminAnalyticsService.getPlatformAnalytics(timeRange),
    staleTime: 60 * 1000 // 1 minute fresh
  });
