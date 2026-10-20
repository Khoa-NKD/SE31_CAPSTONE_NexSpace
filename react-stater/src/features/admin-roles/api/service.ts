import { apiClient } from '@/lib/api-client';
import type {
  PermissionDefinition,
  RoleSummaryKpi,
  UpdateRolePermissionsPayload,
  UpdateRolePermissionItem,
  RolePermissionFilters
} from './types';

/**
 * Fetch role permission matrix definitions.
 * Endpoint: GET /api/v1/admin/roles/permissions
 */
export async function getRolePermissions(
  filters?: RolePermissionFilters
): Promise<PermissionDefinition[]> {
  const params: Record<string, string | undefined> = {};
  if (filters?.module && filters.module !== 'all') {
    params.module = filters.module;
  }
  return apiClient.get<PermissionDefinition[]>('/admin/roles/permissions', { params });
}

/**
 * Fetch summary KPI metrics for platform roles.
 * Endpoint: GET /api/v1/admin/roles/kpis
 */
export async function getRoleKpis(): Promise<RoleSummaryKpi[]> {
  return apiClient.get<RoleSummaryKpi[]>('/admin/roles/kpis');
}

/**
 * Save / apply updated role permissions matrix.
 * Endpoint: PUT /api/v1/admin/roles/permissions
 */
export async function updateRolePermissions(
  payload: UpdateRolePermissionsPayload | PermissionDefinition[] | UpdateRolePermissionItem[]
): Promise<PermissionDefinition[]> {
  const body = Array.isArray(payload) ? { permissions: payload } : payload;
  return apiClient.put<PermissionDefinition[]>('/admin/roles/permissions', body);
}

/**
 * Update a single permission rule by key.
 * Endpoint: PATCH /api/v1/admin/roles/permissions/:key
 */
export async function patchRolePermission(
  key: string,
  payload: Partial<UpdateRolePermissionItem>
): Promise<PermissionDefinition[]> {
  return apiClient.patch<PermissionDefinition[]>(`/admin/roles/permissions/${key}`, payload);
}
