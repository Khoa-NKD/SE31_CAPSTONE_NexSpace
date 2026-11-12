import { queryOptions, useQuery } from '@tanstack/react-query';
import { organizerBookingsService } from './service';
import type { AdminBookingApiItem, AdminBookingKpiResponse, PageResponse } from '@/features/admin-bookings/api/types';

export const organizerBookingKeys = {
  all: ['organizer-bookings'] as const,
  lists: () => [...organizerBookingKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...organizerBookingKeys.lists(), params] as const,
  kpis: () => [...organizerBookingKeys.all, 'kpis'] as const
};

export const organizerBookingsQueryOptions = (params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}) =>
  queryOptions<PageResponse<AdminBookingApiItem>>({
    queryKey: organizerBookingKeys.list(params),
    queryFn: () => organizerBookingsService.getBookings(params),
    staleTime: 15 * 1000
  });

export function useOrganizerBookings(params?: {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return useQuery(organizerBookingsQueryOptions(params));
}

export const organizerBookingKpisQueryOptions = () =>
  queryOptions<AdminBookingKpiResponse>({
    queryKey: organizerBookingKeys.kpis(),
    queryFn: () => organizerBookingsService.getKpis(),
    staleTime: 30 * 1000
  });

export function useOrganizerBookingKpis() {
  return useQuery(organizerBookingKpisQueryOptions());
}
