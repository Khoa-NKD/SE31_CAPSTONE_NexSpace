import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from './service';
import type {
  CreateBookingPayload,
  CalculatePricePayload,
  BookingDto,
  BookingCancellationPreviewDto,
  PriceCalculationResult,
  ResourceAvailabilityItem
} from './booking-types';

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...bookingKeys.details(), String(id)] as const,
  cancellationPreview: (id: string | number) => [...bookingKeys.all, 'cancellation-preview', String(id)] as const,
  byCode: (code: string) => [...bookingKeys.all, 'code', code] as const,
  my: (params?: { status?: string; page?: number; size?: number }) =>
    [...bookingKeys.all, 'my', params?.status, params?.page, params?.size] as const,
  organizer: (params?: {
    workspaceId?: number;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => [...bookingKeys.all, 'organizer', params] as const,
  calendar: (params?: {
    workspaceId?: number;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => [...bookingKeys.all, 'calendar', params] as const,
  byWorkspace: (workspaceId: number | string, page?: number, size?: number) =>
    [...bookingKeys.all, 'workspace', String(workspaceId), page, size] as const,
  availability: (workspaceId: number, startTime: string, endTime: string, floorId?: number) =>
    [...bookingKeys.all, 'availability', workspaceId, floorId, startTime, endTime] as const,
  calculatedPrice: (payload: CalculatePricePayload) =>
    [...bookingKeys.all, 'calculate-price', payload.workspaceId, payload.resourceId, payload.startTime, payload.endTime] as const
};

export function useWorkspaceAvailabilityQuery(
  workspaceId?: number,
  startTime?: string,
  endTime?: string,
  floorId?: number,
  options?: { enabled?: boolean }
) {
  return useQuery<ResourceAvailabilityItem[]>({
    queryKey: bookingKeys.availability(workspaceId ?? 0, startTime ?? '', endTime ?? '', floorId),
    queryFn: () => workspaceService.getWorkspaceAvailability(workspaceId!, startTime!, endTime!, floorId),
    enabled:
      Boolean(workspaceId) &&
      Boolean(startTime) &&
      Boolean(endTime) &&
      (options?.enabled ?? true),
    staleTime: 10_000,
    refetchOnWindowFocus: true
  });
}

export function useCalculatePriceQuery(
  payload?: CalculatePricePayload | null,
  options?: { enabled?: boolean }
) {
  return useQuery<PriceCalculationResult>({
    queryKey: payload ? bookingKeys.calculatedPrice(payload) : ['bookings', 'calculate-price', 'empty'],
    queryFn: () => workspaceService.calculateBookingPrice(payload!),
    enabled:
      Boolean(payload?.workspaceId) &&
      Boolean(payload?.resourceId) &&
      Boolean(payload?.startTime) &&
      Boolean(payload?.endTime) &&
      (options?.enabled ?? true),
    staleTime: 30_000
  });
}

export function useBookingByCodeQuery(bookingCode?: string | null) {
  return useQuery<BookingDto>({
    queryKey: bookingKeys.byCode(bookingCode ?? ''),
    queryFn: () => workspaceService.getBookingByCode(bookingCode!),
    enabled: Boolean(bookingCode && bookingCode.trim().length > 0),
    staleTime: 15_000
  });
}

export function useBookingByIdQuery(id?: number | string | null) {
  return useQuery<BookingDto>({
    queryKey: bookingKeys.detail(id ?? ''),
    queryFn: () => workspaceService.getBookingById(id!),
    enabled: Boolean(id),
    staleTime: 15_000
  });
}

export function useCancellationPreviewQuery(
  id?: number | string | null,
  options?: { enabled?: boolean }
) {
  return useQuery<BookingCancellationPreviewDto>({
    queryKey: bookingKeys.cancellationPreview(id ?? ''),
    queryFn: () => workspaceService.getCancellationPreview(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 10_000
  });
}

export function useMyBookingsQuery(params?: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: bookingKeys.my(params),
    queryFn: () => workspaceService.getMyBookings(params),
    staleTime: 10_000,
    refetchOnWindowFocus: true
  });
}

export function useOrganizerBookingsQuery(params?: {
  workspaceId?: number;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
}) {
  return useQuery({
    queryKey: bookingKeys.organizer(params),
    queryFn: () => workspaceService.getOrganizerBookings(params),
    staleTime: 10_000,
    refetchOnWindowFocus: true
  });
}

export function useOrganizerCalendarQuery(params?: {
  workspaceId?: number;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: bookingKeys.calendar(params),
    queryFn: () => workspaceService.getOrganizerCalendarEvents(params),
    staleTime: 10_000,
    refetchOnWindowFocus: true
  });
}

export function useWorkspaceBookingsQuery(
  workspaceId?: number | string | null,
  page?: number,
  size?: number
) {
  return useQuery({
    queryKey: bookingKeys.byWorkspace(workspaceId ?? '', page, size),
    queryFn: () => workspaceService.getWorkspaceBookings(workspaceId!, page, size),
    enabled: Boolean(workspaceId),
    staleTime: 15_000
  });
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookingDto, Error, CreateBookingPayload>({
    mutationFn: (payload) => workspaceService.createBooking(payload),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.setQueryData(bookingKeys.byCode(booking.bookingCode), booking);
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
    }
  });
}

export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookingDto, Error, { id: number | string; reason?: string }>({
    mutationFn: ({ id, reason }) => workspaceService.cancelBooking(id, reason),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.setQueryData(bookingKeys.byCode(booking.bookingCode), booking);
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
    }
  });
}

export function useApproveBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookingDto, Error, { id: number | string }>({
    mutationFn: ({ id }) => workspaceService.approveBooking(id),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.setQueryData(bookingKeys.byCode(booking.bookingCode), booking);
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
    }
  });
}

export function useRejectBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<BookingDto, Error, { id: number | string; reason?: string }>({
    mutationFn: ({ id, reason }) => workspaceService.rejectBooking(id, reason),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.setQueryData(bookingKeys.byCode(booking.bookingCode), booking);
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
    }
  });
}
