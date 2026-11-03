import { queryOptions } from '@tanstack/react-query';
import { amenityService } from './service';
import type { AmenityFilterParams } from './types';

export const amenityQueries = {
  all: ['amenities'] as const,
  lists: () => [...amenityQueries.all, 'list'] as const,
  available: () =>
    queryOptions({
      queryKey: [...amenityQueries.lists(), 'available'],
      queryFn: () => amenityService.getAvailableAmenities(),
      staleTime: 5 * 60 * 1000 // 5 minutes cache
    }),
  adminList: (params?: AmenityFilterParams) =>
    queryOptions({
      queryKey: [...amenityQueries.lists(), 'admin', params],
      queryFn: () => amenityService.listAmenities(params),
      placeholderData: (prev) => prev
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...amenityQueries.all, 'detail', id],
      queryFn: () => amenityService.getAmenityById(id),
      enabled: id > 0
    })
};
