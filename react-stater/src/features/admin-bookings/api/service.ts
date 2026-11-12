import { apiClient } from '@/lib/api-client';
import type { AdminBookingApiItem, AdminBookingKpiResponse, PageResponse } from './types';

export const adminBookingsService = {
  getBookings: (params?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<AdminBookingApiItem>> =>
    apiClient.get<PageResponse<AdminBookingApiItem>>('/admin/bookings', { params }),

  getKpis: (): Promise<AdminBookingKpiResponse> =>
    apiClient.get<AdminBookingKpiResponse>('/admin/bookings/kpis')
};
