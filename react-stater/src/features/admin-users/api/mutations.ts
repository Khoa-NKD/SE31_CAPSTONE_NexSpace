import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateAdminUserStatus, updateAdminUserRole } from './service';
import { adminUserKeys } from './queries';
import type { AdminUserRecord, UserAccountStatus, BackendUserRole } from './types';
import { ApiError } from '@/lib/api-client';

export interface UpdateUserStatusVariables {
  userId: string;
  nextStatus:
    | UserAccountStatus
    | 'Active'
    | 'Locked'
    | 'Inactive'
    | 'Deleted'
    | 'ACTIVE'
    | 'LOCKED'
    | 'INACTIVE'
    | 'DELETED';
  userName?: string;
  reason?: string;
  lockedUntil?: string | null;
}

/**
 * TanStack Query mutation hook for changing an admin user's status.
 * Handles cache invalidation, error handling, and toast feedback.
 */
export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserRecord, Error, UpdateUserStatusVariables>({
    mutationFn: ({ userId, nextStatus, reason, lockedUntil }) =>
      updateAdminUserStatus(userId, { status: nextStatus, reason, lockedUntil }),

    onSuccess: (updatedUser, variables) => {
      // Invalidate all admin users queries so list and details update from server state
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });

      // Optimistically or explicitly update cached detail if present
      queryClient.setQueryData(adminUserKeys.detail(updatedUser.id), updatedUser);

      const displayName = variables.userName || updatedUser.name;
      const upperStatus = String(variables.nextStatus).toUpperCase();
      const title =
        upperStatus === 'LOCKED'
          ? `Đã khóa tài khoản ${displayName}`
          : upperStatus === 'DELETED'
          ? `Đã xóa mềm tài khoản ${displayName}`
          : upperStatus === 'INACTIVE'
          ? `Đã tạm ngưng tài khoản ${displayName}`
          : `Đã kích hoạt tài khoản ${displayName}`;

      toast.success(title, {
        description: `Trạng thái tài khoản đã được cập nhật thành ${upperStatus}.`
      });
    },

    onError: (err: unknown, variables) => {
      let description = 'Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại sau.';
      if (err instanceof ApiError) {
        description = err.message;
      } else if (err instanceof Error) {
        description = err.message;
      }

      const displayName = variables.userName || variables.userId;
      toast.error(`Thao tác cập nhật trạng thái thất bại cho ${displayName}`, {
        description
      });
    }
  });
}

export interface UpdateUserRoleVariables {
  userId: string;
  role: BackendUserRole;
  userName?: string;
  reason: string;
}

/**
 * TanStack Query mutation hook for changing an admin user's role.
 * Handles cache invalidation, error handling, and toast feedback.
 */
export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserRecord, Error, UpdateUserRoleVariables>({
    mutationFn: ({ userId, role, reason }) =>
      updateAdminUserRole(userId, { role, reason }),

    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      queryClient.setQueryData(adminUserKeys.detail(updatedUser.id), updatedUser);

      const displayName = variables.userName || updatedUser.name;
      toast.success(`Cập nhật vai trò thành công`, {
        description: `Tài khoản ${displayName} đã được chuyển sang vai trò ${variables.role}.`
      });
    },

    onError: (err: unknown, variables) => {
      let description = 'Không thể thay đổi vai trò người dùng. Vui lòng thử lại sau.';
      if (err instanceof ApiError) {
        description = err.message;
      } else if (err instanceof Error) {
        description = err.message;
      }

      const displayName = variables.userName || variables.userId;
      toast.error(`Đổi vai trò thất bại cho ${displayName}`, {
        description
      });
    }
  });
}
