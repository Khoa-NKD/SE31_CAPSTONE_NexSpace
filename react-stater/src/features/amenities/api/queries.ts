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
  organizerList: (params?: AmenityFilterParams) =>
    queryOptions({
      queryKey: [...amenityQueries.lists(), 'organizer', params],
      queryFn: () => amenityService.listOrganizerAmenities(params),
      placeholderData: (prev) => prev
    }),
  organizerAvailable: () =>
    queryOptions({
      queryKey: [...amenityQueries.lists(), 'organizer-available'],
      queryFn: () => amenityService.getOrganizerAvailableAmenities(),
      staleTime: 5 * 60 * 1000 // 5 minutes cache
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...amenityQueries.all, 'detail', id],
      queryFn: () => amenityService.getAmenityById(id),
      enabled: id > 0
    }),
  workspaceAmenities: (workspaceId: number | string | undefined) =>
    queryOptions({
      queryKey: [...amenityQueries.all, 'workspace', String(workspaceId)] as const,
      queryFn: () => amenityService.getWorkspaceAmenities(workspaceId!),
      enabled: !!workspaceId
    })
};
