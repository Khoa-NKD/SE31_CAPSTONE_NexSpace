import { apiClient } from '@/lib/api-client';
import type {
  AdminUserRecord,
  AdminUserFilters,
  UpdateUserStatusPayload,
  AdminUsersPageResponse
} from './types';

/**
 * Fetch paginated & filtered admin users list.
 * Communicates with REST endpoint GET /api/v1/admin/users
 */
export async function getAdminUsers(
  filters?: AdminUserFilters
): Promise<AdminUsersPageResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters?.search) params.search = filters.search;
  if (filters?.role && filters.role !== 'all') params.role = filters.role;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.kyc && filters.kyc !== 'all') params.kyc = filters.kyc;
  if (filters?.page !== undefined) params.page = filters.page;
  if (filters?.size !== undefined) params.size = filters.size;
  if (filters?.sort) params.sort = filters.sort;

  return apiClient.get<AdminUsersPageResponse>('/admin/users', { params });
}

/**
 * Fetch a single admin user by ID.
 * Communicates with REST endpoint GET /api/v1/admin/users/:id
 */
export async function getAdminUserById(id: string): Promise<AdminUserRecord> {
  return apiClient.get<AdminUserRecord>(`/admin/users/${id}`);
}

/**
 * Update an admin user's moderation status (Lock / Unlock / Active).
 * Communicates with REST endpoint PATCH /api/v1/admin/users/:id/status
 */
export async function updateAdminUserStatus(
  id: string,
  payload: UpdateUserStatusPayload
): Promise<AdminUserRecord> {
  return apiClient.patch<AdminUserRecord>(`/admin/users/${id}/status`, payload);
}
