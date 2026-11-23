import { apiClient } from '@/lib/api-client';
import type {
  AdminDashboardOverviewResponseDTO,
  AdminPlatformAnalyticsResponseDTO
} from './types';

export const adminOverviewService = {
  getOverview: async (timeRange: string = '7d'): Promise<AdminDashboardOverviewResponseDTO> => {
    return apiClient.get<AdminDashboardOverviewResponseDTO>('/admin/analytics/overview', {
      params: { timeRange }
    });
  },

  getPlatformAnalytics: async (timeRange: string = '7d'): Promise<AdminPlatformAnalyticsResponseDTO> => {
    return apiClient.get<AdminPlatformAnalyticsResponseDTO>('/admin/analytics/platform', {
      params: { timeRange }
    });
  }
};
