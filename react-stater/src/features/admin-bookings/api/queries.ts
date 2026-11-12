import { queryOptions, useQuery } from '@tanstack/react-query';
import { adminBookingsService } from './service';
import type { AdminBookingApiItem, AdminBookingKpiResponse, PageResponse } from './types';

export const adminBookingKeys = {
  all: ['admin-bookings'] as const,
  lists: () => [...adminBookingKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...adminBookingKeys.lists(), params] as const,
  kpis: () => [...adminBookingKeys.all, 'kpis'] as const
};

export const adminBookingsQueryOptions = (params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}) =>
  queryOptions<PageResponse<AdminBookingApiItem>>({
    queryKey: adminBookingKeys.list(params),
    queryFn: () => adminBookingsService.getBookings(params),
    staleTime: 15 * 1000
  });

export function useAdminBookings(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return useQuery(adminBookingsQueryOptions(params));
}

export const adminBookingKpisQueryOptions = () =>
  queryOptions<AdminBookingKpiResponse>({
    queryKey: adminBookingKeys.kpis(),
    queryFn: () => adminBookingsService.getKpis(),
    staleTime: 30 * 1000
  });

export function useAdminBookingKpis() {
  return useQuery(adminBookingKpisQueryOptions());
}
