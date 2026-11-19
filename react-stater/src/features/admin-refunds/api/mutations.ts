import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRefundService } from './service';
import { adminRefundKeys } from './queries';
import type { ApproveRefundRequestDto, RejectRefundRequestDto } from './types';
import { toast } from 'sonner';

export function useApproveRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ApproveRefundRequestDto }) =>
      adminRefundService.approveRefund(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: adminRefundKeys.all });
      toast.success('Phê duyệt hoàn tiền thành công', {
        description: `Đã thực hiện chi ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.approvedAmount || result.requestedAmount)} qua cổng PayOS (Mã payout: ${result.refundReference || 'Đã ghi nhận'}).`
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Không thể phê duyệt và chi tiền hoàn qua PayOS';
      toast.error('Phê duyệt thất bại', { description: message });
    }
  });
}

export function useRejectRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RejectRefundRequestDto }) =>
      adminRefundService.rejectRefund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRefundKeys.all });
      toast.success('Đã từ chối yêu cầu hoàn tiền', {
        description: 'Đã cập nhật trạng thái từ chối và gửi ghi chú xử lý.'
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Không thể từ chối yêu cầu hoàn tiền';
      toast.error('Thao tác thất bại', { description: message });
    }
  });
}
