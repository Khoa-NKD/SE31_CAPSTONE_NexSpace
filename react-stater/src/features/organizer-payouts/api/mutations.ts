import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { organizerPayoutService } from './service';
import { organizerPayoutKeys } from './queries';
import type {
  RequestAutoPayoutDto,
  RequestCancelAutoPayoutDto,
  ManualWithdrawalRequestDto
} from './types';

export function useRequestAutoPayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RequestAutoPayoutDto) => organizerPayoutService.requestAutoPayout(data),
    onSuccess: () => {
      toast.success('Đã gửi yêu cầu kích hoạt Auto Payout lên Admin xét duyệt thành công!');
      queryClient.invalidateQueries({ queryKey: organizerPayoutKeys.settings() });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message;
      toast.error(msg || 'Không thể gửi yêu cầu kích hoạt Auto Payout');
    }
  });
}

export function useRequestCancelAutoPayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: RequestCancelAutoPayoutDto) => organizerPayoutService.requestCancelAutoPayout(data),
    onSuccess: () => {
      toast.success('Đã gửi yêu cầu hủy chế độ Auto Payout lên Admin xét duyệt!');
      queryClient.invalidateQueries({ queryKey: organizerPayoutKeys.settings() });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message;
      toast.error(msg || 'Không thể gửi yêu cầu hủy Auto Payout');
    }
  });
}

export function useManualWithdrawalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManualWithdrawalRequestDto) => organizerPayoutService.withdrawManual(data),
    onSuccess: () => {
      toast.success('Lệnh rút tiền về tài khoản ngân hàng đã được thực hiện thành công qua PayOS!');
      queryClient.invalidateQueries({ queryKey: organizerPayoutKeys.balance() });
      queryClient.invalidateQueries({ queryKey: organizerPayoutKeys.all });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message;
      toast.error(msg || 'Không thể thực hiện rút tiền');
    }
  });
}
