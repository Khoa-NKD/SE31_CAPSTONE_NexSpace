import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceAvailabilityService } from './service';
import { availabilityKeys } from './queries';
import type { HoldResourceRequestDto, HoldResourceResponseDto } from './types';

/**
 * Hook Mutation gửi yêu cầu giữ chỗ tạm thời (Temporary Hold) kèm Idempotent Reuse và giới hạn tối đa 3 hold.
 */
export function useHoldResourceMutation() {
  const queryClient = useQueryClient();

  return useMutation<HoldResourceResponseDto, Error, HoldResourceRequestDto>({
    mutationFn: (payload) => resourceAvailabilityService.holdResource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}

/**
 * Hook Mutation cho phép khách hàng chủ động hủy/nhả phiên giữ chỗ tạm thời (Manual Release).
 */
export function useReleaseHoldMutation() {
  const queryClient = useQueryClient();

  return useMutation<HoldResourceResponseDto, Error, number>({
    mutationFn: (bookingId) => resourceAvailabilityService.releaseHold(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}
