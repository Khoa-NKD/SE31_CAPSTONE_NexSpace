import { queryOptions } from '@tanstack/react-query';
import { getAdminUsers, getAdminUserById } from './service';
import type { AdminUserFilters } from './types';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters: AdminUserFilters) => [...adminUserKeys.lists(), filters] as const,
  details: () => [...adminUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const
};

/**
 * TanStack Query options for the admin users list.
 */
export const adminUsersQueryOptions = (filters: AdminUserFilters = {}) =>
  queryOptions({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => getAdminUsers(filters)
  });

/**
 * TanStack Query options for fetching individual user details by ID.
 */
export const adminUserDetailQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: id ? adminUserKeys.detail(id) : [...adminUserKeys.details(), 'empty'],
    queryFn: () => (id ? getAdminUserById(id) : null),
    enabled: Boolean(id)
  });
