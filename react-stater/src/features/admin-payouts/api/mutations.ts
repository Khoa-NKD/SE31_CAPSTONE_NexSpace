import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminPayoutService } from './service';
import { adminPayoutKeys } from './queries';
import type { ReviewPayoutRequestDto } from './types';

export function useReviewPayoutRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewPayoutRequestDto }) =>
      adminPayoutService.reviewRequest(id, data),
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.approved
          ? 'Đã phê duyệt yêu cầu Auto Payout của Organizer thành công!'
          : 'Đã từ chối yêu cầu Auto Payout.'
      );
      queryClient.invalidateQueries({ queryKey: adminPayoutKeys.requests(1, 10) });
      queryClient.invalidateQueries({ queryKey: adminPayoutKeys.all });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Lỗi khi xử lý phê duyệt yêu cầu Payout');
    }
  });
}

export function useRetryWithdrawalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: number) => adminPayoutService.retryWithdrawal(batchId),
    onSuccess: () => {
      toast.success('Đã gửi lại lệnh chi tiền PayOS thành công!');
      queryClient.invalidateQueries({ queryKey: adminPayoutKeys.ledger() });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Thử lại chi tiền thất bại');
    }
  });
}
