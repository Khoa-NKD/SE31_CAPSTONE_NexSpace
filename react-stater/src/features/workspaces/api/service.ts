import { apiClient } from '@/lib/api-client';
import type {
  CanonicalWorkspace,
  WorkspaceListResponse,
  WorkspaceFilterParams,
  PublicWorkspaceDetail,
  PublicWorkspaceListResponse,
  PublicWorkspaceFilterParams,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceLifecycleDto,
  SubmitWorkspaceDto,
  AdminReviewWorkspaceDto,
  AdminModerationWorkspaceDto,
  AdminWorkspaceKpisDto
} from './types';

/**
 * Reconciled legacy identifier mappings discovered across Customer, Organizer, and Admin UI screens.
 * Properly separates distinct physical venues (e.g. 72 Le Thanh Ton WS-101 vs Bitexco WS-104; Tay Ho WS-108 vs Ba Dinh WS-120).
 */
export const LEGACY_WORKSPACE_ID_MAP: Record<string, string> = {
  // WS-101 (NexSpace Central Tower — District 1, 72 Le Thanh Ton)
  '1': 'WS-101',

  // WS-104 (NexSpace Saigon Prime Hub, Bitexco 2 Hai Trieu)
  '2': 'WS-104',
  'ws-sg-prime-01': 'WS-104',
  'hive-central-hcm': 'WS-104',
  'hub-01': 'WS-104',
  'hub-sg-001': 'WS-104',

  // WS-108 (Hanoi Capital Innovation Lab, 58 Xuan Dieu, Tay Ho)
  'westlake-loft-hanoi': 'WS-108',
  'hub-hn-001': 'WS-108',

  // WS-092 (Da Nang Marina Tech Collective, 36 Bach Dang)
  'mykhe-coastal-danang': 'WS-092',
  'hub-05': 'WS-092',
  'ws-vn-4401': 'WS-092',
  'hub-dn-001': 'WS-092',

  // WS-115 (Thao Dien Creative Haven, 42 Nguyen Van Huong)
  'komorebi-executive-hcm': 'WS-115',
  '3': 'WS-115',
  'hub-sg-002': 'WS-115',

  // WS-120 (Westlake Executive Suites, 12 Kim Ma, Ba Dinh)
  'ba-dinh-boardroom-hanoi': 'WS-120',
  'hub-03': 'WS-120',
  'ws-vn-6620': 'WS-120',
  'hub-hn-002': 'WS-120',

  // WS-128 (District 1 TechSpace — Creative Pod B, 88 Dong Khoi)
  'ws-landmark-bt-02': 'WS-128',
  'nexus-innovation-hcm': 'WS-128',
  'hub-02': 'WS-128',
  'ws-vn-7719': 'WS-128',
  'hub-sg-003': 'WS-128',

  // Additional Organizer / Expansion Mocks
  'ws-tech-d7-03': 'WS-135',
  'hub-sg-004': 'WS-135',
  'ws-capital-d3-04': 'WS-142',
  'hub-sg-005': 'WS-142',
  '4': 'WS-150',
  'hub-sg-006': 'WS-150'
};

/**
 * Resolves a legacy workspace identifier or alias to its authoritative canonical ID.
 */
export function resolveWorkspaceId(aliasOrId: string): string {
  if (!aliasOrId) return aliasOrId;
  const normalized = aliasOrId.toLowerCase().trim();
  return LEGACY_WORKSPACE_ID_MAP[normalized] || aliasOrId;
}

export const workspaceService = {
  /**
   * Public marketplace query: returns only approved, active workspaces with public-safe projections.
   */
  async getPublicWorkspaces(params?: PublicWorkspaceFilterParams): Promise<PublicWorkspaceListResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params) {
      if (params.search) queryParams.search = params.search;
      if (params.city) queryParams.city = params.city;
      if (params.district) queryParams.district = params.district;
      if (params.category) queryParams.category = params.category;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }

    return apiClient.get<PublicWorkspaceListResponse>('/public/workspaces', {
      params: queryParams
    });
  },

  /**
   * Public workspace detail: returns public-safe detail projection or 404.
   */
  async getPublicWorkspaceById(id: string): Promise<PublicWorkspaceDetail> {
    const resolvedId = resolveWorkspaceId(id);
    return apiClient.get<PublicWorkspaceDetail>(`/public/workspaces/${encodeURIComponent(resolvedId)}`);
  },

  /**
   * Fetches paginated workspaces for Organizer/Admin with filtering and sorting.
   */
  async getWorkspaces(params?: WorkspaceFilterParams): Promise<WorkspaceListResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params) {
      if (params.search) queryParams.search = params.search;
      if (params.city) queryParams.city = params.city;
      if (params.district) queryParams.district = params.district;
      if (params.category) queryParams.category = params.category;
      if (params.organizerId) queryParams.organizerId = params.organizerId;
      if (params.status) queryParams.status = params.status;
      if (params.reviewStatus) queryParams.reviewStatus = params.reviewStatus;
      if (params.operatingStatus) queryParams.operatingStatus = params.operatingStatus;
      if (params.moderationStatus) queryParams.moderationStatus = params.moderationStatus;
      if (params.isPublic !== undefined) queryParams.isPublic = params.isPublic;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }

    const headers: Record<string, string> = {};
    if (params?.role) {
      headers['x-mock-role'] = params.role;
      if (params.role.toLowerCase() === 'administrator' || params.role.toLowerCase() === 'admin') {
        headers['x-mock-user-id'] = 'USR-1882';
      }
    }
    if (params?.organizerId) {
      headers['x-organizer-id'] = params.organizerId;
      if (!headers['x-mock-role']) {
        headers['x-mock-role'] = 'organizer';
      }
    }
    if (!headers['x-mock-role'] && !headers['x-organizer-id'] && !params?.isPublic) {
      headers['x-mock-role'] = 'organizer';
      headers['x-organizer-id'] = 'USR-9432';
    }

    return apiClient.get<WorkspaceListResponse>('/workspaces', {
      params: queryParams,
      headers
    });
  },

  /**
   * Fetches a single workspace by canonical ID, workspace code, or legacy alias for owner/admin.
   */
  async getWorkspaceById(
    id: string,
    options?: { role?: string; organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {};
    const role = options?.role?.toLowerCase();
    if (role === 'administrator' || role === 'admin') {
      headers['x-mock-role'] = 'Administrator';
      headers['x-mock-user-id'] = 'USR-1882';
    } else if (options?.organizerId) {
      headers['x-mock-role'] = options?.role || 'organizer';
      headers['x-organizer-id'] = options.organizerId;
    } else if (options?.role) {
      headers['x-mock-role'] = options.role;
      if (options.role.toLowerCase() === 'customer') {
        headers['x-mock-user-id'] = 'USR-8821';
      }
    } else {
      headers['x-mock-role'] = 'organizer';
      headers['x-organizer-id'] = 'USR-9432';
    }
    return apiClient.get<CanonicalWorkspace>(`/workspaces/${encodeURIComponent(resolvedId)}`, {
      headers
    });
  },

  /**
   * Creates a new workspace in Draft state.
   */
  async createWorkspace(
    dto: CreateWorkspaceDto,
    options?: { organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const headers: Record<string, string> = {
      'x-mock-role': 'Organizer',
      'x-organizer-id': options?.organizerId || dto.organizerId || 'USR-9432'
    };
    return apiClient.post<CanonicalWorkspace>('/workspaces', dto, { headers });
  },

  /**
   * Partially updates an existing workspace record using owner-editable allowlist.
   */
  async updateWorkspace(
    id: string,
    dto: UpdateWorkspaceDto,
    options?: { organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Organizer',
      'x-organizer-id': options?.organizerId || 'USR-9432'
    };
    return apiClient.patch<CanonicalWorkspace>(
      `/workspaces/${encodeURIComponent(resolvedId)}`,
      dto,
      { headers }
    );
  },

  /**
   * Dedicated Organizer lifecycle command endpoint for operational state transitions
   * (pause, resume, maintenance, archive) with strict optimistic concurrency control.
   */
  async updateWorkspaceLifecycle(
    id: string,
    dto: WorkspaceLifecycleDto,
    options?: { organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Organizer',
      'x-organizer-id': options?.organizerId || 'USR-9432'
    };
    return apiClient.patch<CanonicalWorkspace>(
      `/workspaces/${encodeURIComponent(resolvedId)}/lifecycle`,
      dto,
      { headers }
    );
  },

  /**
   * Dedicated Organizer command endpoint for submitting a complete Draft workspace for Admin review.
   */
  async submitWorkspace(
    id: string,
    dto?: SubmitWorkspaceDto,
    options?: { organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Organizer',
      'x-organizer-id': options?.organizerId || 'USR-9432'
    };
    return apiClient.post<CanonicalWorkspace>(
      `/workspaces/${encodeURIComponent(resolvedId)}/submit`,
      dto || {},
      { headers }
    );
  },

  /**
   * Dedicated Admin endpoint for reviewing workspace submission (Approve / Reject).
   */
  async adminReviewWorkspace(
    id: string,
    dto: AdminReviewWorkspaceDto,
    options?: { adminId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Administrator',
      'x-mock-user-id': options?.adminId || dto.reviewedBy || 'USR-1882'
    };
    return apiClient.patch<CanonicalWorkspace>(
      `/admin/workspaces/${encodeURIComponent(resolvedId)}/review`,
      dto,
      { headers }
    );
  },

  /**
   * Dedicated Admin endpoint for moderating workspace (Suspend / Restore).
   */
  async adminModerateWorkspace(
    id: string,
    dto: AdminModerationWorkspaceDto,
    options?: { adminId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Administrator',
      'x-mock-user-id': options?.adminId || dto.suspendedBy || 'USR-1882'
    };
    return apiClient.patch<CanonicalWorkspace>(
      `/admin/workspaces/${encodeURIComponent(resolvedId)}/moderation`,
      dto,
      { headers }
    );
  },

  /**
   * Dedicated Administrator KPI aggregation: fetches platform-wide workspace metrics
   * computed across 100% of canonical records independently of list pagination.
   */
  async getAdminWorkspaceKpis(options?: { adminId?: string }): Promise<AdminWorkspaceKpisDto> {
    const headers: Record<string, string> = {
      'x-mock-role': 'Administrator',
      'x-mock-user-id': options?.adminId || 'USR-1882'
    };
    return apiClient.get<AdminWorkspaceKpisDto>('/admin/workspaces/kpis', { headers });
  },

  /**
   * Uploads a local binary image (JPEG/PNG/WebP) to the development-only mock media service.
   * Returns durable relative media URL (/api/v1/media/<filename>).
   */
  async uploadMedia(file: File | Blob, filename?: string): Promise<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }> {
    const formData = new FormData();
    formData.append('file', file, filename || (file instanceof File ? file.name : 'upload.png'));
    return apiClient.post('/media/upload', formData);
  }
};
