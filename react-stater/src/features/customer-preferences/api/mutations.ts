import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { customerPreferenceService } from './service';
import { customerPreferenceKeys } from './queries';
import type { UpdateCustomerPreferencePayload } from './types';

export function useSaveCustomerPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCustomerPreferencePayload) =>
      customerPreferenceService.updateMyPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerPreferenceKeys.me() });
      toast.success('Cập nhật sở thích không gian thành công!');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string } | null;
        toast.error(payload?.message || err.message || 'Cập nhật sở thích thất bại');
      } else {
        toast.error('Lỗi kết nối khi lưu sở thích không gian');
      }
    }
  });
}

export function useDeleteCustomerPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => customerPreferenceService.deleteMyPreferences(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerPreferenceKeys.me() });
      toast.success('Đã đặt lại sở thích không gian về mặc định');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string } | null;
        toast.error(payload?.message || err.message || 'Xóa sở thích thất bại');
      } else {
        toast.error('Lỗi kết nối khi xóa sở thích không gian');
      }
    }
  });
}

