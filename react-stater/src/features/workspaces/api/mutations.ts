import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from './service';
import { workspaceQueryKeys } from './queries';
import type {
  CanonicalWorkspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceLifecycleDto,
  SubmitWorkspaceDto,
  AdminReviewWorkspaceDto,
  AdminModerationWorkspaceDto,
  WorkspaceMediaDto,
  AddWorkspaceMediaPayload,
  ReorderWorkspaceMediaPayload,
  SyncWorkspaceMediaPayload,
  WorkspaceAssetDto,
  CreateWorkspaceAssetPayload,
  UpdateWorkspaceAssetPayload,
  MaintenanceLogDto,
  CreateMaintenanceLogPayload,
  UpdateMaintenanceLogPayload
} from './types';
import { ApiError } from '@/lib/api-client';

export interface UpdateWorkspaceVariables {
  id: string;
  dto: UpdateWorkspaceDto;
  workspaceName?: string;
}

/**
 * TanStack Query mutation hook for creating a new workspace.
 */
export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, CreateWorkspaceDto>({
    mutationFn: (dto) => workspaceService.createWorkspace(dto),

    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      toast.success('Workspace Created', {
        description: `Draft created for "${newWorkspace.name}" (${newWorkspace.id}).`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not create workspace. Please check required fields.';
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Failed to Create Workspace', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for updating a workspace.
 */
export function useUpdateWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, UpdateWorkspaceVariables>({
    mutationFn: ({ id, dto }) => workspaceService.updateWorkspace(id, dto),

    onSuccess: (updatedWorkspace, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.setQueryData(workspaceQueryKeys.detail(updatedWorkspace.id), updatedWorkspace);

      const displayName = variables.workspaceName || updatedWorkspace.name;
      toast.success('Workspace Updated', {
        description: `Changes saved for "${displayName}".`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not update workspace. Please check your inputs.';
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Failed to Update Workspace', { description });
    }
  });
}

export interface AdminReviewWorkspaceVariables {
  id: string;
  dto: AdminReviewWorkspaceDto;
  workspaceName?: string;
}

/**
 * TanStack Query mutation hook for Administrator review governance (Approve / Reject).
 */
export function useAdminReviewWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, AdminReviewWorkspaceVariables>({
    mutationFn: ({ id, dto }) => workspaceService.adminReviewWorkspace(id, dto),

    onSuccess: (updatedWorkspace, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.setQueryData(workspaceQueryKeys.detail(updatedWorkspace.id), updatedWorkspace);

      const displayName = variables.workspaceName || updatedWorkspace.name;
      toast.success('Workspace Review Updated', {
        description: `Review status for "${displayName}" set to ${updatedWorkspace.reviewStatus}.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not submit review decision.';
      if (err instanceof ApiError) {
        if (err.status === 409) {
          queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
          description = 'Concurrency conflict: this workspace was modified by another session. Latest data refreshed; please reconfirm your decision.';
        } else if (err.status === 403) {
          description = err.message || 'You are not authorized to perform administrator review actions.';
        } else if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Failed to Submit Review', { description });
    }
  });
}

export interface AdminModerationWorkspaceVariables {
  id: string;
  dto: AdminModerationWorkspaceDto;
  workspaceName?: string;
}

/**
 * TanStack Query mutation hook for Administrator moderation (Suspend / Restore).
 */
export function useAdminModerateWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, AdminModerationWorkspaceVariables>({
    mutationFn: ({ id, dto }) => workspaceService.adminModerateWorkspace(id, dto),

    onSuccess: (updatedWorkspace, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.setQueryData(workspaceQueryKeys.detail(updatedWorkspace.id), updatedWorkspace);

      const displayName = variables.workspaceName || updatedWorkspace.name;
      toast.success('Moderation Updated', {
        description: `Moderation status for "${displayName}" set to ${updatedWorkspace.moderationStatus}.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not submit moderation update.';
      if (err instanceof ApiError) {
        if (err.status === 409) {
          queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
          description = 'Concurrency conflict: this workspace was modified by another session. Latest data refreshed; please reconfirm your decision.';
        } else if (err.status === 403) {
          description = err.message || 'You are not authorized to perform administrator moderation actions.';
        } else if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Failed to Moderate Workspace', { description });
    }
  });
}

export interface WorkspaceLifecycleVariables {
  id: string;
  dto: WorkspaceLifecycleDto;
  workspaceName?: string;
}

/**
 * TanStack Query mutation hook for Organizer workspace operational lifecycle transitions
 * (pause, resume, maintenance, archive) with optimistic concurrency support.
 */
export function useWorkspaceLifecycleMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, WorkspaceLifecycleVariables>({
    mutationFn: ({ id, dto }) => workspaceService.updateWorkspaceLifecycle(id, dto),

    onSuccess: (updatedWorkspace, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.setQueryData(workspaceQueryKeys.detail(updatedWorkspace.id), updatedWorkspace);

      const displayName = variables.workspaceName || updatedWorkspace.name;
      const actionName = variables.dto.action.charAt(0).toUpperCase() + variables.dto.action.slice(1);
      toast.success(`Workspace ${actionName}d`, {
        description: `Operational state updated for "${displayName}".`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not update workspace lifecycle.';
      if (err instanceof ApiError) {
        if (err.status === 409) {
          description = 'Concurrency conflict: this workspace was modified by another session. Please refresh and try again.';
        } else if (err.status === 403) {
          description = err.message || 'Forbidden operation: cannot modify a suspended workspace.';
        } else if (err.status === 400) {
          description = err.message || 'Illegal state transition for current workspace status.';
        } else {
          description = err.message;
        }
      }
      toast.error('Lifecycle Action Failed', { description });
    }
  });
}

export interface SubmitWorkspaceVariables {
  id: string;
  dto?: SubmitWorkspaceDto;
  workspaceName?: string;
}

/**
 * TanStack Query mutation hook for Organizer workspace submission for Administrator review.
 */
export function useSubmitWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, SubmitWorkspaceVariables>({
    mutationFn: ({ id, dto }) => workspaceService.submitWorkspace(id, dto),

    onSuccess: (updatedWorkspace, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.setQueryData(workspaceQueryKeys.detail(updatedWorkspace.id), updatedWorkspace);

      const displayName = variables.workspaceName || updatedWorkspace.name;
      toast.success('Workspace Submitted for Review', {
        description: `"${displayName}" (${updatedWorkspace.id}) has been submitted for platform review.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not submit workspace. Please check required fields.';
      if (err instanceof ApiError) {
        if (err.status === 409) {
          description = 'Concurrency conflict: this workspace was modified by another session. Please reload the latest draft.';
        } else if (err.status === 403) {
          description = err.message || 'You are not authorized to submit this workspace.';
        } else if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Submission Failed', { description });
    }
  });
}

export interface UploadMediaVariables {
  file: File | Blob;
  filename?: string;
}

export interface UploadMediaResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * TanStack Query mutation hook for uploading media to the media storage service.
 */
export function useUploadMediaMutation() {
  return useMutation<UploadMediaResult, Error, UploadMediaVariables>({
    mutationFn: ({ file, filename }) => workspaceService.uploadMedia(file, filename),

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Media upload failed';
      toast.error('Upload Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for soft-deleting / archiving a workspace.
 */
export function useDeleteWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation<CanonicalWorkspace, Error, string>({
    mutationFn: (id: string) => workspaceService.deleteWorkspace(id),

    onSuccess: (archived) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      toast.success('Workspace Archived', {
        description: `Successfully archived "${archived.name}".`

/**
 * TanStack Query mutation hook for deleting media from the storage service.
 */
export function useDeleteMediaMutation() {
  return useMutation<void, Error, { publicId: string }>({
    mutationFn: ({ publicId }) => workspaceService.deleteMedia(publicId),

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Media deletion failed';
      toast.error('Delete Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for adding an image to a workspace gallery.
 */
export function useAddWorkspaceMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceMediaDto,
    Error,
    { workspaceId: number | string; payload: AddWorkspaceMediaPayload }
  >({
    mutationFn: ({ workspaceId, payload }) =>
      workspaceService.addWorkspaceMedia(workspaceId, payload),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(variables.workspaceId)
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.detail(String(variables.workspaceId))
      });
      toast.success('Photo Added', {
        description: 'Photo has been added to the workspace gallery.'

      });
    },

    onError: (err: unknown) => {
<<<<<<< HEAD
      const msg = err instanceof ApiError ? err.message : 'Could not archive workspace.';
      toast.error('Archive Failed', { description: msg });
    }
  });
}
=======
      const description = err instanceof Error ? err.message : 'Failed to add photo';
      toast.error('Add Photo Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for setting a photo as cover photo.
 */
export function useSetCoverMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceMediaDto,
    Error,
    { workspaceId: number | string; mediaId: number | string }
  >({
    mutationFn: ({ workspaceId, mediaId }) =>
      workspaceService.setCoverMedia(workspaceId, mediaId),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(variables.workspaceId)
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.detail(String(variables.workspaceId))
      });
      toast.success('Cover Photo Updated', {
        description: 'Designated as primary cover photo.'
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Failed to set cover photo';
      toast.error('Update Cover Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for reordering photos in a workspace gallery.
 */
export function useReorderWorkspaceMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceMediaDto[],
    Error,
    { workspaceId: number | string; payload: ReorderWorkspaceMediaPayload }
  >({
    mutationFn: ({ workspaceId, payload }) =>
      workspaceService.reorderWorkspaceMedia(workspaceId, payload),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(variables.workspaceId)
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Failed to reorder photos';
      toast.error('Reorder Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for deleting a photo from a workspace gallery.
 */
export function useDeleteWorkspaceMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { workspaceId: number | string; mediaId: number | string }
  >({
    mutationFn: ({ workspaceId, mediaId }) =>
      workspaceService.deleteWorkspaceMedia(workspaceId, mediaId),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(variables.workspaceId)
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.detail(String(variables.workspaceId))
      });
      toast.info('Photo Deleted', {
        description: 'Photo has been removed from workspace gallery.'
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Failed to delete photo';
      toast.error('Delete Failed', { description });
    }
  });
}

/**
 * TanStack Query mutation hook for syncing all gallery photos of a workspace.
 */
export function useSyncWorkspaceMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceMediaDto[],
    Error,
    { workspaceId: number | string; payload: SyncWorkspaceMediaPayload }
  >({
    mutationFn: ({ workspaceId, payload }) =>
      workspaceService.syncWorkspaceMedia(workspaceId, payload),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.media(variables.workspaceId)
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.detail(String(variables.workspaceId))
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Failed to sync photos';
      toast.error('Sync Failed', { description });
    }
  });
}

/**
 * Mutation for creating a new workspace asset.
 */
export function useCreateWorkspaceAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceAssetDto,
    Error,
    { workspaceId: number | string; payload: CreateWorkspaceAssetPayload }
  >({
    mutationFn: ({ workspaceId, payload }) =>
      workspaceService.createWorkspaceAsset(workspaceId, payload),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...workspaceQueryKeys.all, 'assets', String(variables.workspaceId)]
      });
      toast.success('Đã thêm tài sản mới', {
        description: `Tài sản "${data.name}" (${data.assetCode}) đã được ghi nhận vào không gian.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Không thể thêm tài sản. Vui lòng kiểm tra lại thông tin.';
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Lỗi thêm tài sản', { description });
    }
  });
}

/**
 * Mutation for updating an existing workspace asset.
 */
export function useUpdateWorkspaceAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceAssetDto,
    Error,
    { workspaceId: number | string; assetId: number | string; payload: UpdateWorkspaceAssetPayload }
  >({
    mutationFn: ({ workspaceId, assetId, payload }) =>
      workspaceService.updateWorkspaceAsset(workspaceId, assetId, payload),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...workspaceQueryKeys.all, 'assets', String(variables.workspaceId)]
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.assetDetail(variables.workspaceId, variables.assetId)
      });
      toast.success('Cập nhật tài sản thành công', {
        description: `Thông tin tài sản "${data.name}" (${data.assetCode}) đã được lưu.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Không thể cập nhật tài sản.';
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Lỗi cập nhật', { description });
    }
  });
}

/**
 * Mutation for deleting a workspace asset.
 */
export function useDeleteWorkspaceAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { workspaceId: number | string; assetId: number | string; assetCode?: string }
  >({
    mutationFn: ({ workspaceId, assetId }) =>
      workspaceService.deleteWorkspaceAsset(workspaceId, assetId),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...workspaceQueryKeys.all, 'assets', String(variables.workspaceId)]
      });
      toast.success('Đã xóa tài sản', {
        description: variables.assetCode
          ? `Tài sản ${variables.assetCode} đã được gỡ khỏi danh sách.`
          : 'Tài sản đã được gỡ khỏi danh sách.'
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Không thể xóa tài sản.';
      toast.error('Lỗi xóa tài sản', { description });
    }
  });
}

/**
 * Mutation for creating a maintenance log on an asset.
 */
export function useCreateMaintenanceLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    MaintenanceLogDto,
    Error,
    { workspaceId: number | string; assetId: number | string; payload: CreateMaintenanceLogPayload }
  >({
    mutationFn: ({ workspaceId, assetId, payload }) =>
      workspaceService.createMaintenanceLog(workspaceId, assetId, payload),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.maintenanceLogs(variables.workspaceId, variables.assetId)
      });
      queryClient.invalidateQueries({
        queryKey: [...workspaceQueryKeys.all, 'assets', String(variables.workspaceId)]
      });
      toast.success('Ghi nhận lịch bảo trì thành công', {
        description: 'Trạng thái và lịch sử bảo trì của thiết bị đã được cập nhật.'
      });
    },

    onError: (err: unknown) => {
      let description = 'Không thể ghi nhận lịch bảo trì.';
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          const firstErr = Object.values(err.validationErrors)[0];
          description = firstErr || err.message;
        } else {
          description = err.message;
        }
      }
      toast.error('Lỗi tạo lịch bảo trì', { description });
    }
  });
}

/**
 * Mutation for updating a maintenance log.
 */
export function useUpdateMaintenanceLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    MaintenanceLogDto,
    Error,
    {
      workspaceId: number | string;
      assetId: number | string;
      logId: number | string;
      payload: UpdateMaintenanceLogPayload;
    }
  >({
    mutationFn: ({ workspaceId, assetId, logId, payload }) =>
      workspaceService.updateMaintenanceLog(workspaceId, assetId, logId, payload),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.maintenanceLogs(variables.workspaceId, variables.assetId)
      });
      queryClient.invalidateQueries({
        queryKey: [...workspaceQueryKeys.all, 'assets', String(variables.workspaceId)]
      });
      toast.success('Cập nhật tiến độ bảo trì thành công', {
        description: 'Trạng thái lượt bảo trì và thiết bị đã được đồng bộ.'
      });
    },

    onError: (err: unknown) => {
      const description = err instanceof Error ? err.message : 'Không thể cập nhật lịch bảo trì.';
      toast.error('Lỗi cập nhật bảo trì', { description });
    }
  });
}

>>>>>>> origin/feature/frontend
