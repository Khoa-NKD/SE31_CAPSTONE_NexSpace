import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateAdminUserStatus } from './service';
import { adminUserKeys } from './queries';
import type { AdminUserRecord, UserAccountStatus } from './types';
import { ApiError } from '@/lib/api-client';

export interface UpdateUserStatusVariables {
  userId: string;
  nextStatus: UserAccountStatus;
  userName?: string;
  reason?: string;
}

/**
 * TanStack Query mutation hook for changing an admin user's status.
 * Handles cache invalidation, error handling, and toast feedback.
 */
export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserRecord, Error, UpdateUserStatusVariables>({
    mutationFn: ({ userId, nextStatus, reason }) =>
      updateAdminUserStatus(userId, { status: nextStatus, reason }),

    onSuccess: (updatedUser, variables) => {
      // Invalidate all admin users queries so list and details update from server state
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });

      // Optimistically or explicitly update cached detail if present
      queryClient.setQueryData(adminUserKeys.detail(updatedUser.id), updatedUser);

      const displayName = variables.userName || updatedUser.name;
      toast.success(
        variables.nextStatus === 'Locked'
          ? `Account ${displayName} Locked`
          : `Account ${displayName} Unlocked`,
        {
          description: `User moderation status updated to ${variables.nextStatus}.`
        }
      );
    },

    onError: (err: unknown, variables) => {
      let description = 'Could not update user account status. Please check your network connection.';
      if (err instanceof ApiError) {
        description = err.message;
      } else if (err instanceof Error) {
        description = err.message;
      }

      const displayName = variables.userName || variables.userId;
      toast.error(`Failed to update status for ${displayName}`, {
        description
      });
    }
  });
}
