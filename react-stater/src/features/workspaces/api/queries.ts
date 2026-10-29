import { queryOptions, useQuery } from '@tanstack/react-query';
import { workspaceService } from './service';
import type { WorkspaceFilterParams, PublicWorkspaceFilterParams } from './types';

export const workspaceQueryKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceQueryKeys.all, 'list'] as const,
  list: (params: WorkspaceFilterParams = {}) => [...workspaceQueryKeys.lists(), params] as const,
  publicLists: () => [...workspaceQueryKeys.all, 'public-list'] as const,
  publicList: (params: PublicWorkspaceFilterParams = {}) => [...workspaceQueryKeys.publicLists(), params] as const,
  details: () => [...workspaceQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceQueryKeys.details(), id] as const,
  publicDetails: () => [...workspaceQueryKeys.all, 'public-detail'] as const,
  publicDetail: (id: string) => [...workspaceQueryKeys.publicDetails(), id] as const,
  adminKpis: () => [...workspaceQueryKeys.all, 'admin-kpis'] as const
};

/**
 * TanStack Query options for the workspaces list.
 */
export const workspacesQueryOptions = (params: WorkspaceFilterParams = {}) =>
  queryOptions({
    queryKey: workspaceQueryKeys.list(params),
    queryFn: () => workspaceService.getWorkspaces(params)
  });

/**
 * TanStack Query options for the public marketplace workspaces list.
 */
export const publicWorkspacesQueryOptions = (params: PublicWorkspaceFilterParams = {}) =>
  queryOptions({
    queryKey: workspaceQueryKeys.publicList(params),
    queryFn: () => workspaceService.getPublicWorkspaces(params)
  });

/**
 * TanStack Query options for fetching individual workspace details by ID or alias.
 */
export const workspaceDetailQueryOptions = (
  id: string | null,
  options?: { role?: string; organizerId?: string }
) =>
  queryOptions({
    queryKey: id ? [...workspaceQueryKeys.detail(id), options] : [...workspaceQueryKeys.details(), 'empty'],
    queryFn: () => (id ? workspaceService.getWorkspaceById(id, options) : null),
    enabled: Boolean(id)
  });

/**
 * TanStack Query options for fetching individual public workspace details by ID or alias.
 */
export const publicWorkspaceDetailQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: id ? workspaceQueryKeys.publicDetail(id) : [...workspaceQueryKeys.publicDetails(), 'empty'],
    queryFn: () => (id ? workspaceService.getPublicWorkspaceById(id) : null),
    enabled: Boolean(id),
    retry: (failureCount, error: unknown) => {
      const err = error as { status?: number; statusCode?: number } | null | undefined;
      if (err?.status === 404 || err?.statusCode === 404) return false;
      return failureCount < 2;
    }
  });

/**
 * Hook for querying workspaces list.
 */
export function useWorkspacesQuery(params: WorkspaceFilterParams = {}) {
  return useQuery(workspacesQueryOptions(params));
}

/**
 * Hook for querying public marketplace workspaces list.
 */
export function usePublicWorkspacesQuery(params: PublicWorkspaceFilterParams = {}) {
  return useQuery(publicWorkspacesQueryOptions(params));
}

/**
 * Hook for querying a single workspace by ID.
 */
export function useWorkspaceDetailQuery(
  id: string | null,
  options?: { role?: string; organizerId?: string }
) {
  return useQuery(workspaceDetailQueryOptions(id, options));
}

/**
 * Hook for querying a single public workspace by ID.
 */
export function usePublicWorkspaceDetailQuery(id: string | null) {
  return useQuery(publicWorkspaceDetailQueryOptions(id));
}

/**
 * TanStack Query options for fetching platform-wide administrator workspace KPIs.
 */
export const adminWorkspaceKpisQueryOptions = (options?: { adminId?: string }) =>
  queryOptions({
    queryKey: workspaceQueryKeys.adminKpis(),
    queryFn: () => workspaceService.getAdminWorkspaceKpis(options)
  });

/**
 * Hook for querying platform-wide administrator workspace KPIs.
 */
export function useAdminWorkspaceKpisQuery(options?: { adminId?: string }) {
  return useQuery(adminWorkspaceKpisQueryOptions(options));
}
