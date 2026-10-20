import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from './service';
import { workspaceQueryKeys } from './queries';
import type {
  CanonicalWorkspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceLifecycleDto,
  AdminReviewWorkspaceDto,
  AdminModerationWorkspaceDto
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
        if (err.validationErrors) {
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
        if (err.validationErrors) {
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
