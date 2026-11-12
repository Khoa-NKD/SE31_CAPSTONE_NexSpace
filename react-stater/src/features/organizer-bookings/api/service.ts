import { apiClient } from '@/lib/api-client';
import type { AdminBookingApiItem, AdminBookingKpiResponse, PageResponse } from '@/features/admin-bookings/api/types';

export const organizerBookingsService = {
  getBookings: (params?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<AdminBookingApiItem>> =>
    apiClient.get<PageResponse<AdminBookingApiItem>>('/organizer/bookings', { params }),

  getKpis: (): Promise<AdminBookingKpiResponse> =>
    apiClient.get<AdminBookingKpiResponse>('/organizer/bookings/kpis')
};
