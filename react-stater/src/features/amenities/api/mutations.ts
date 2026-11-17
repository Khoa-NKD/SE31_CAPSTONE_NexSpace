import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { amenityService } from './service';
import { amenityQueries } from './queries';
import type {
  CreateAmenityPayload,
  UpdateAmenityPayload,
  AssignWorkspaceAmenitiesPayload
} from './types';

export function useCreateAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAmenityPayload) => amenityService.createAmenity(payload),
    onSuccess: (data) => {
      toast.success(c('Amenity created successfully', 'Tạo tiện ích thành công'), {
        description: `Amenity "${data.name}" has been added to the catalog.`
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to create amenity', 'Không thể tạo tiện ích'), {
        description: error.message || 'An error occurred while creating the amenity.'
      });
    }
  });
}

export function useUpdateAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAmenityPayload }) =>
      amenityService.updateAmenity(id, payload),
    onSuccess: (data) => {
      toast.success(c('Amenity updated successfully', 'Cập nhật tiện ích thành công'), {
        description: `Amenity "${data.name}" has been updated.`
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to update amenity', 'Không thể cập nhật tiện ích'), {
        description: error.message || 'Unable to update the amenity.'
      });
    }
  });
}

export function useToggleAmenityStatusMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      amenityService.toggleAmenityStatus(id, active),
    onSuccess: (_, variables) => {
      const msg = variables.active
        ? c('Amenity activated', 'Đã kích hoạt tiện ích')
        : c('Amenity deactivated', 'Đã vô hiệu hóa tiện ích');
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', {
        description: error.message || 'Unable to change amenity status.'
      });
    }
  });
}

export function useDeleteAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => amenityService.deleteAmenity(id),
    onSuccess: () => {
      toast.success(c('Amenity deleted successfully', 'Xóa tiện ích thành công'), {
        description: 'The amenity has been removed from the platform catalog.'
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to delete amenity', 'Không thể xóa tiện ích'), {
        description: error.message || 'Unable to delete the amenity.'
      });
    }
  });
}

export function useSyncWorkspaceAmenitiesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload
    }: {
      workspaceId: number | string;
      payload: AssignWorkspaceAmenitiesPayload;
    }) => amenityService.syncWorkspaceAmenities(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...amenityQueries.all, 'workspace', String(variables.workspaceId)]
      });
    }
  });
}

export function useCreateOrganizerAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAmenityPayload) => amenityService.createOrganizerAmenity(payload),
    onSuccess: (data) => {
      toast.success(c('Amenity created successfully', 'Tạo tiện ích thành công'), {
        description: c(
          `Custom amenity "${data.name}" has been added to your organization's list.`,
          `Tiện ích riêng "${data.name}" đã được thêm vào danh sách của tổ chức.`
        )
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to create amenity', 'Không thể tạo tiện ích'), {
        description:
          error.message ||
          c(
            'An error occurred while creating the custom amenity.',
            'Đã có lỗi xảy ra khi tạo tiện ích riêng.'
          )
      });
    }
  });
}

export function useUpdateOrganizerAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAmenityPayload }) =>
      amenityService.updateOrganizerAmenity(id, payload),
    onSuccess: (data) => {
      toast.success(c('Amenity updated successfully', 'Cập nhật tiện ích thành công'), {
        description: c(
          `Amenity "${data.name}" has been updated.`,
          `Tiện ích "${data.name}" đã được cập nhật.`
        )
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to update amenity', 'Không thể cập nhật tiện ích'), {
        description:
          error.message ||
          c(
            'An error occurred while updating the amenity.',
            'Đã có lỗi xảy ra khi cập nhật tiện ích.'
          )
      });
    }
  });
}

export function useToggleOrganizerAmenityStatusMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      amenityService.toggleOrganizerAmenityStatus(id, active),
    onSuccess: (_, variables) => {
      const msg = variables.active
        ? c('Amenity activated', 'Đã kích hoạt tiện ích')
        : c('Amenity deactivated', 'Đã vô hiệu hóa tiện ích');
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Unable to change status', 'Không thể đổi trạng thái'), {
        description: error.message || c('An error occurred.', 'Đã có lỗi xảy ra.')
      });
    }
  });
}

export function useDeleteOrganizerAmenityMutation() {
  const c = useOrganizerCopy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => amenityService.deleteOrganizerAmenity(id),
    onSuccess: () => {
      toast.success(c('Amenity deleted successfully', 'Xóa tiện ích thành công'), {
        description: c(
          "The custom amenity has been removed from your organization's list.",
          'Tiện ích riêng đã được gỡ khỏi danh sách tổ chức.'
        )
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error(c('Failed to delete amenity', 'Không thể xóa tiện ích'), {
        description:
          error.message ||
          c(
            'Unable to delete the amenity; it may still be assigned to a workspace.',
            'Không thể xóa tiện ích (có thể tiện ích đang được gắn vào không gian).'
          )
      });
    }
  });
}
