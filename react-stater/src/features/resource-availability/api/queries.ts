import { queryOptions, useQuery } from '@tanstack/react-query';
import { resourceAvailabilityService } from './service';
import type { DeskAvailabilityParams, DeskAvailabilityResponseDto } from './types';

export const availabilityKeys = {
  all: ['availability'] as const,
  desks: () => [...availabilityKeys.all, 'desks'] as const,
  deskList: (params?: DeskAvailabilityParams) => [...availabilityKeys.desks(), params] as const
};

export const deskAvailabilityQueryOptions = (params: DeskAvailabilityParams) =>
  queryOptions<DeskAvailabilityResponseDto[]>({
    queryKey: availabilityKeys.deskList(params),
    queryFn: () => resourceAvailabilityService.getDeskAvailability(params),
    staleTime: 10 * 1000, // 10 giây cho dữ liệu khả dụng thời gian thực
    refetchOnWindowFocus: true
  });

export function useDeskAvailability(params: DeskAvailabilityParams, options?: { enabled?: boolean }) {
  return useQuery({
    ...deskAvailabilityQueryOptions(params),
    enabled: options?.enabled ?? (!!params.workspaceId && !!params.startTime && !!params.endTime)
  });
}

