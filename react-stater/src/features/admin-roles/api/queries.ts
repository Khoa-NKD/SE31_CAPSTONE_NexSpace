import { queryOptions } from '@tanstack/react-query';
import { getRolePermissions, getRoleKpis } from './service';
import type { RolePermissionFilters } from './types';

export const roleKeys = {
  all: ['admin-roles'] as const,
  permissions: () => [...roleKeys.all, 'permissions'] as const,
  permissionsList: (filters?: RolePermissionFilters) =>
    [...roleKeys.permissions(), filters] as const,
  kpis: () => [...roleKeys.all, 'kpis'] as const
};

/**
 * TanStack Query options for the role permissions matrix.
 */
export const rolePermissionsQueryOptions = (filters?: RolePermissionFilters) =>
  queryOptions({
    queryKey: roleKeys.permissionsList(filters),
    queryFn: () => getRolePermissions(filters),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

/**
 * TanStack Query options for the role summary KPIs.
 */
export const roleKpisQueryOptions = () =>
  queryOptions({
    queryKey: roleKeys.kpis(),
    queryFn: () => getRoleKpis(),
    staleTime: 1000 * 60 * 5
  });
