import { queryOptions, useQuery } from '@tanstack/react-query';
import { resourceAvailabilityService } from './service';
import type {
  DeskAvailabilityParams,
  DeskAvailabilityResponseDto,
  RoomAvailabilityParams,
  RoomAvailabilityResponseDto
} from './types';

export const availabilityKeys = {
  all: ['availability'] as const,
  desks: () => [...availabilityKeys.all, 'desks'] as const,
  deskList: (params?: DeskAvailabilityParams) => [...availabilityKeys.desks(), params] as const,
  rooms: () => [...availabilityKeys.all, 'rooms'] as const,
  roomList: (params?: RoomAvailabilityParams) => [...availabilityKeys.rooms(), params] as const
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

export const roomAvailabilityQueryOptions = (params: RoomAvailabilityParams) =>
  queryOptions<RoomAvailabilityResponseDto[]>({
    queryKey: availabilityKeys.roomList(params),
    queryFn: () => resourceAvailabilityService.getRoomAvailability(params),
    staleTime: 10 * 1000, // 10 giây cho dữ liệu khả dụng thời gian thực
    refetchOnWindowFocus: true
  });

export function useRoomAvailability(params: RoomAvailabilityParams, options?: { enabled?: boolean }) {
  return useQuery({
    ...roomAvailabilityQueryOptions(params),
    enabled: options?.enabled ?? (!!params.workspaceId && !!params.startTime && !!params.endTime)
  });
}


