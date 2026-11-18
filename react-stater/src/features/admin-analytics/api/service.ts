import { apiClient } from '@/lib/api-client';
import type { AdminPlatformAnalyticsResponseDTO } from './types';

export const adminAnalyticsService = {
  getPlatformAnalytics: async (timeRange: string = '30D'): Promise<AdminPlatformAnalyticsResponseDTO> => {
    return apiClient.get<AdminPlatformAnalyticsResponseDTO>('/admin/analytics/platform', {
      params: { timeRange }
    });
  }
};
