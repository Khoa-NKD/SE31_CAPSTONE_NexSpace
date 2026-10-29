import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateRolePermissions } from './service';
import { roleKeys } from './queries';
import type {
  PermissionDefinition,
  UpdateRolePermissionItem
} from './types';
import { ApiError } from '@/lib/api-client';

export interface UpdateRolePermissionsVariables {
  permissions: UpdateRolePermissionItem[] | PermissionDefinition[];
  modifiedCount?: number;
}

/**
 * TanStack Query mutation hook for updating role permissions matrix.
 */
export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    PermissionDefinition[],
    Error,
    UpdateRolePermissionsVariables
  >({
    mutationFn: ({ permissions }) => updateRolePermissions(permissions),

    onSuccess: (updatedPermissions, variables) => {
      // Invalidate queries to refresh any other subscribers
      queryClient.invalidateQueries({ queryKey: roleKeys.all });

      // Optimistically/explicitly update permissions query cache
      queryClient.setQueryData(roleKeys.permissionsList(), updatedPermissions);

      const count = variables.modifiedCount ?? variables.permissions.length;
      toast.success('Permissions Applied', {
        description: `Cryptographically signed and applied ${count} modified permission ${
          count === 1 ? 'rule' : 'rules'
        }.`
      });
    },

    onError: (err: unknown) => {
      let description = 'Could not update role permissions. Please check your network connection.';
      if (err instanceof ApiError) {
        description = err.message;
      } else if (err instanceof Error) {
        description = err.message;
      }

      toast.error('Failed to Apply Permissions', {
        description
      });
    }
  });
}
