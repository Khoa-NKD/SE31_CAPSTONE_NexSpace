import { queryOptions } from '@tanstack/react-query';
import { adminOverviewService } from './service';

export const adminOverviewKeys = {
  all: ['admin-overview'] as const,
  detail: (range: string) => [...adminOverviewKeys.all, range] as const,
  platform: (range: string) => [...adminOverviewKeys.all, 'platform', range] as const
};

export const adminOverviewQueryOptions = (timeRange: string = '7d') =>
  queryOptions({
    queryKey: adminOverviewKeys.detail(timeRange),
    queryFn: () => adminOverviewService.getOverview(timeRange),
    staleTime: 60 * 1000 // 1 minute fresh
  });

export const adminPlatformAnalyticsQueryOptions = (timeRange: string = '7d') =>
  queryOptions({
    queryKey: adminOverviewKeys.platform(timeRange),
    queryFn: () => adminOverviewService.getPlatformAnalytics(timeRange),
    staleTime: 60 * 1000
  });
