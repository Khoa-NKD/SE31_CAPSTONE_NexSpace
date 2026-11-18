import { apiClient } from '@/lib/api-client';
import type { AdminDashboardOverviewResponseDTO } from './types';

export const adminOverviewService = {
  getOverview: async (timeRange: string = '7d'): Promise<AdminDashboardOverviewResponseDTO> => {
    return apiClient.get<AdminDashboardOverviewResponseDTO>('/admin/analytics/overview', {
      params: { timeRange }
    });
  }
};
