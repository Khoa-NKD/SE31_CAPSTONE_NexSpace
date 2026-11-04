import { queryOptions, useQuery } from '@tanstack/react-query';
import { workspaceService } from './service';
import type {
  WorkspaceFilterParams,
  PublicWorkspaceFilterParams,
  WorkspaceAssetFilterParams
} from './types';

export const workspaceQueryKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceQueryKeys.all, 'list'] as const,
  list: (params: WorkspaceFilterParams = {}) => [...workspaceQueryKeys.lists(), params] as const,
  publicLists: () => [...workspaceQueryKeys.all, 'public-list'] as const,
  publicList: (params: PublicWorkspaceFilterParams = {}) => [...workspaceQueryKeys.publicLists(), params] as const,
  details: () => [...workspaceQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceQueryKeys.details(), id] as const,
  media: (id: string | number) => [...workspaceQueryKeys.all, 'media', String(id)] as const,
  assets: (workspaceId: string | number, params?: WorkspaceAssetFilterParams) =>
    [...workspaceQueryKeys.all, 'assets', String(workspaceId), params] as const,
  assetDetail: (workspaceId: string | number, assetId: string | number) =>
    [...workspaceQueryKeys.all, 'asset-detail', String(workspaceId), String(assetId)] as const,
  maintenanceLogs: (workspaceId: string | number, assetId: string | number) =>
    [...workspaceQueryKeys.all, 'maintenance-logs', String(workspaceId), String(assetId)] as const,
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

/**
 * TanStack Query options for fetching gallery media for a workspace.
 */
export const workspaceMediaQueryOptions = (workspaceId: number | string | null | undefined) =>
  queryOptions({
    queryKey: workspaceId ? workspaceQueryKeys.media(workspaceId) : [...workspaceQueryKeys.all, 'media', 'none'],
    queryFn: () => (workspaceId ? workspaceService.getWorkspaceMedia(workspaceId) : []),
    enabled: Boolean(workspaceId)
  });

/**
 * Hook for querying gallery media for a workspace.
 */
export function useWorkspaceMediaQuery(workspaceId: number | string | null | undefined) {
  return useQuery(workspaceMediaQueryOptions(workspaceId));
}

/**
 * TanStack Query options for fetching assets for a workspace.
 */
export const workspaceAssetsQueryOptions = (
  workspaceId: number | string | null | undefined,
  params?: WorkspaceAssetFilterParams
) =>
  queryOptions({
    queryKey: workspaceId ? workspaceQueryKeys.assets(workspaceId, params) : [...workspaceQueryKeys.all, 'assets', 'none'],
    queryFn: () => (workspaceId ? workspaceService.getWorkspaceAssets(workspaceId, params) : { listObjects: [], pageNumber: 1, pageSize: 20, totalRecords: 0, totalPages: 0, hasNext: false, hasPrevious: false }),
    enabled: Boolean(workspaceId)
  });

/**
 * Hook for querying workspace assets.
 */
export function useWorkspaceAssetsQuery(
  workspaceId: number | string | null | undefined,
  params?: WorkspaceAssetFilterParams
) {
  return useQuery(workspaceAssetsQueryOptions(workspaceId, params));
}

/**
 * TanStack Query options for fetching a single workspace asset.
 */
export const workspaceAssetDetailQueryOptions = (
  workspaceId: number | string | null | undefined,
  assetId: number | string | null | undefined
) =>
  queryOptions({
    queryKey:
      workspaceId && assetId
        ? workspaceQueryKeys.assetDetail(workspaceId, assetId)
        : [...workspaceQueryKeys.all, 'asset-detail', 'none'],
    queryFn: () => (workspaceId && assetId ? workspaceService.getWorkspaceAssetById(workspaceId, assetId) : null),
    enabled: Boolean(workspaceId && assetId)
  });

/**
 * Hook for querying single workspace asset details.
 */
export function useWorkspaceAssetDetailQuery(
  workspaceId: number | string | null | undefined,
  assetId: number | string | null | undefined
) {
  return useQuery(workspaceAssetDetailQueryOptions(workspaceId, assetId));
}

/**
 * TanStack Query options for fetching maintenance logs of an asset.
 */
export const assetMaintenanceLogsQueryOptions = (
  workspaceId: number | string | null | undefined,
  assetId: number | string | null | undefined
) =>
  queryOptions({
    queryKey:
      workspaceId && assetId
        ? workspaceQueryKeys.maintenanceLogs(workspaceId, assetId)
        : [...workspaceQueryKeys.all, 'maintenance-logs', 'none'],
    queryFn: () => (workspaceId && assetId ? workspaceService.getMaintenanceLogs(workspaceId, assetId) : []),
    enabled: Boolean(workspaceId && assetId)
  });

/**
 * Hook for querying maintenance logs of an asset.
 */
export function useAssetMaintenanceLogsQuery(
  workspaceId: number | string | null | undefined,
  assetId: number | string | null | undefined
) {
  return useQuery(assetMaintenanceLogsQueryOptions(workspaceId, assetId));
}


/**
 * TanStack Query options for fetching operating hours.
 */
export const operatingHoursQueryOptions = (workspaceId: string | number | null | undefined) =>
  queryOptions({
    queryKey: ['workspaces', 'operating-hours', String(workspaceId)],
    queryFn: () => (workspaceId ? workspaceService.getOperatingHours(workspaceId) : []),
    enabled: Boolean(workspaceId)
  });

/**
 * Hook for querying workspace operating hours.
 */
export function useOperatingHoursQuery(workspaceId: string | number | null | undefined) {
  return useQuery(operatingHoursQueryOptions(workspaceId));
}
