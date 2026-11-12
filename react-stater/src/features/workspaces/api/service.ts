import { apiClient } from '@/lib/api-client';
import type {
  CanonicalWorkspace,
  WorkspaceListResponse,
  WorkspaceFilterParams,
  PublicWorkspaceDetail,
  PublicWorkspaceListResponse,
  PublicWorkspaceFilterParams,
  NearbyWorkspacesParams,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceLifecycleDto,
  SubmitWorkspaceDto,
  AdminReviewWorkspaceDto,
  AdminModerationWorkspaceDto,
  AdminFeaturedWorkspaceDto,
  AdminWorkspaceKpisDto,
  WorkspaceMediaDto,
  AddWorkspaceMediaPayload,
  ReorderWorkspaceMediaPayload,
  SyncWorkspaceMediaPayload,
  WorkspaceAssetDto,
  CreateWorkspaceAssetPayload,
  UpdateWorkspaceAssetPayload,
  MaintenanceLogDto,
  CreateMaintenanceLogPayload,
  UpdateMaintenanceLogPayload,
  WorkspaceAssetFilterParams,
  PaginatedAssetResponse,
  WorkspaceOperatingHour,
  WorkspaceAmenityDto,
  AssignWorkspaceAmenitiesPayload
} from './types';
import type {
  CreateBookingPayload,
  CalculatePricePayload,
  PriceCalculationResult,
  BookingDto,
  BookingCancellationPreviewDto,
  ResourceAvailabilityItem
} from './booking-types';

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
 * Robust against numeric, string, or nullish identifier inputs.
 */
export function resolveWorkspaceId(aliasOrId: unknown): string {
  if (aliasOrId === null || aliasOrId === undefined) return '';
  const str = String(aliasOrId).trim();
  if (!str) return '';
  const normalized = str.toLowerCase();
  if (/^\d+$/.test(normalized)) return normalized;
  return LEGACY_WORKSPACE_ID_MAP[normalized] || str;
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
      if (params.limit !== undefined) {
        queryParams.limit = params.limit;
        queryParams.size = params.limit;
      }
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) {
        queryParams.sortOrder = params.sortOrder;
        queryParams.sortDir = params.sortOrder;
      }
    }

    return apiClient.get<PublicWorkspaceListResponse>('/public/workspaces', {
      params: queryParams
    });
  },

  /**
   * Public marketplace proximity query: returns approved, active workspaces within radius sorted by distance.
   */
  async getNearbyWorkspaces(params: NearbyWorkspacesParams): Promise<PublicWorkspaceListResponse> {
    const queryParams: Record<string, string | number | undefined> = {
      lat: params.lat,
      lng: params.lng,
      radiusKm: params.radiusKm ?? 10.0
    };
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
      queryParams.size = params.limit;
    }

    return apiClient.get<PublicWorkspaceListResponse>('/public/workspaces/nearby', {
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
      if (params.limit !== undefined) {
        queryParams.limit = params.limit;
        queryParams.size = params.limit;
      }
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) {
        queryParams.sortOrder = params.sortOrder;
        queryParams.sortDir = params.sortOrder;
      }
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

    const isAdmin =
      params?.role?.toLowerCase() === 'administrator' ||
      params?.role?.toLowerCase() === 'admin';
    const endpoint = isAdmin ? '/admin/workspaces' : '/workspaces';

    return apiClient.get<WorkspaceListResponse>(endpoint, {
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
   * Soft-deletes / archives a workspace without deleting historical data.
   */
  async deleteWorkspace(
    id: string,
    options?: { organizerId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Organizer',
      'x-organizer-id': options?.organizerId || 'USR-9432'
    };
    return apiClient.delete<CanonicalWorkspace>(
      '/workspaces/' + encodeURIComponent(resolvedId),
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
   * Dedicated Admin endpoint for setting/clearing featured status and order.
   */
  async adminSetFeatured(
    id: string,
    dto: AdminFeaturedWorkspaceDto,
    options?: { adminId?: string }
  ): Promise<CanonicalWorkspace> {
    const resolvedId = resolveWorkspaceId(id);
    const headers: Record<string, string> = {
      'x-mock-role': 'Administrator',
      'x-mock-user-id': options?.adminId || 'USR-1882'
    };
    return apiClient.patch<CanonicalWorkspace>(
      `/admin/workspaces/${encodeURIComponent(resolvedId)}/featured`,
      dto,
      { headers }
    );
  },

  /**
   * Public endpoint to fetch currently featured active workspaces for Marketplace / Homepage.
   */
  async getFeaturedWorkspaces(): Promise<CanonicalWorkspace[]> {
    return apiClient.get<CanonicalWorkspace[]>('/public/workspaces/featured');
  },

  /**
   * Uploads a local binary image (JPEG/PNG/WebP) to the media storage service.
   * Returns durable media URL.
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
  },

  /**
   * Deletes an uploaded media file by its publicId or id.
   */
  async deleteMedia(publicIdOrId: string): Promise<void> {
    return apiClient.delete('/media/delete', {
      params: { publicId: publicIdOrId },
    });
  },

  /**
   * Retrieves all media belonging to a workspace, ordered by displayOrder.
   */
  async getWorkspaceMedia(workspaceId: number | string): Promise<WorkspaceMediaDto[]> {
    return apiClient.get(`/workspaces/${workspaceId}/media`);
  },

  /**
   * Adds an image to a workspace gallery.
   */
  async addWorkspaceMedia(
    workspaceId: number | string,
    payload: AddWorkspaceMediaPayload
  ): Promise<WorkspaceMediaDto> {
    return apiClient.post(`/workspaces/${workspaceId}/media`, payload);
  },

  /**
   * Synchronizes / replaces the entire gallery of a workspace.
   */
  async syncWorkspaceMedia(
    workspaceId: number | string,
    payload: SyncWorkspaceMediaPayload
  ): Promise<WorkspaceMediaDto[]> {
    return apiClient.put(`/workspaces/${workspaceId}/media/sync`, payload);
  },

  /**
   * Sets a specific media as the primary cover photo of a workspace.
   */
  async setCoverMedia(
    workspaceId: number | string,
    mediaId: number | string
  ): Promise<WorkspaceMediaDto> {
    return apiClient.patch(`/workspaces/${workspaceId}/media/${mediaId}/cover`, {});
  },

  /**
   * Reorders media items within a workspace gallery.
   */
  async reorderWorkspaceMedia(
    workspaceId: number | string,
    payload: ReorderWorkspaceMediaPayload
  ): Promise<WorkspaceMediaDto[]> {
    return apiClient.put(`/workspaces/${workspaceId}/media/reorder`, payload);
  },

  /**
   * Deletes a specific media item from a workspace gallery.
   */
  async deleteWorkspaceMedia(
    workspaceId: number | string,
    mediaId: number | string
  ): Promise<void> {
    return apiClient.delete(`/workspaces/${workspaceId}/media/${mediaId}`);
  },

  /**
   * Retrieves all amenities assigned to a workspace.
   */
  async getWorkspaceAmenities(workspaceId: number | string): Promise<WorkspaceAmenityDto[]> {
    const numericId = typeof workspaceId === 'string' ? Number(workspaceId.replace(/\D/g, '')) : workspaceId;
    return apiClient.get<WorkspaceAmenityDto[]>(`/workspaces/${numericId}/amenities`);
  },

  /**
   * Synchronizes / assigns full amenities list to a workspace.
   */
  async syncWorkspaceAmenities(
    workspaceId: number | string,
    payload: AssignWorkspaceAmenitiesPayload
  ): Promise<WorkspaceAmenityDto[]> {
    const numericId = typeof workspaceId === 'string' ? Number(workspaceId.replace(/\D/g, '')) : workspaceId;
    return apiClient.put<WorkspaceAmenityDto[]>(`/workspaces/${numericId}/amenities`, payload);
  },

  /**
   * Fetches paginated assets for a workspace with status and search filters.
   */
  async getWorkspaceAssets(
    workspaceId: number | string,
    params?: WorkspaceAssetFilterParams
  ): Promise<PaginatedAssetResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params?.all !== undefined) queryParams.all = params.all;
    if (params?.status) queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.size !== undefined) queryParams.size = params.size;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortDir) queryParams.sortDir = params.sortDir;

    return apiClient.get(`/workspaces/${workspaceId}/assets`, {
      params: queryParams
    });
  },

  /**
   * Fetches a single asset by ID.
   */
  async getWorkspaceAssetById(
    workspaceId: number | string,
    assetId: number | string
  ): Promise<WorkspaceAssetDto> {
    return apiClient.get(`/workspaces/${workspaceId}/assets/${assetId}`);
  },

  /**
   * Creates a new workspace asset.
   */
  async createWorkspaceAsset(
    workspaceId: number | string,
    payload: CreateWorkspaceAssetPayload
  ): Promise<WorkspaceAssetDto> {
    return apiClient.post(`/workspaces/${workspaceId}/assets`, payload);
  },

  /**
   * Updates an existing workspace asset.
   */
  async updateWorkspaceAsset(
    workspaceId: number | string,
    assetId: number | string,
    payload: UpdateWorkspaceAssetPayload
  ): Promise<WorkspaceAssetDto> {
    return apiClient.put(`/workspaces/${workspaceId}/assets/${assetId}`, payload);
  },

  /**
   * Deletes a workspace asset.
   */
  async deleteWorkspaceAsset(
    workspaceId: number | string,
    assetId: number | string
  ): Promise<void> {
    return apiClient.delete(`/workspaces/${workspaceId}/assets/${assetId}`);
  },

  /**
   * Fetches maintenance logs for a specific asset.
   */
  async getMaintenanceLogs(
    workspaceId: number | string,
    assetId: number | string
  ): Promise<MaintenanceLogDto[]> {
    return apiClient.get(`/workspaces/${workspaceId}/assets/${assetId}/maintenance`);
  },

  /**
   * Creates a maintenance / repair log for an asset.
   */
  async createMaintenanceLog(
    workspaceId: number | string,
    assetId: number | string,
    payload: CreateMaintenanceLogPayload
  ): Promise<MaintenanceLogDto> {
    return apiClient.post(`/workspaces/${workspaceId}/assets/${assetId}/maintenance`, payload);
  },

  /**
   * Updates progress or completion of a maintenance log.
   */
  async updateMaintenanceLog(
    workspaceId: number | string,
    assetId: number | string,
    logId: number | string,
    payload: UpdateMaintenanceLogPayload
  ): Promise<MaintenanceLogDto> {
    return apiClient.patch(`/workspaces/${workspaceId}/assets/${assetId}/maintenance/${logId}`, payload);
  },

  /**
   * Retrieves operating hours for a workspace.
   */
  async getOperatingHours(workspaceId: string | number): Promise<WorkspaceOperatingHour[]> {
    return apiClient.get<WorkspaceOperatingHour[]>(`/workspaces/${workspaceId}/operating-hours`);
  },

  /**
   * Updates operating hours for a workspace (all 7 days).
   */
  async updateOperatingHours(
    workspaceId: string | number,
    hours: WorkspaceOperatingHour[]
  ): Promise<WorkspaceOperatingHour[]> {
    return apiClient.put<WorkspaceOperatingHour[]>(`/workspaces/${workspaceId}/operating-hours`, hours);
  },

  /**
   * Retrieves public operating hours for an active workspace.
   */
  async getPublicOperatingHours(workspaceId: string | number): Promise<WorkspaceOperatingHour[]> {
    return apiClient.get<WorkspaceOperatingHour[]>(`/public/workspaces/${workspaceId}/operating-hours`);
  },

  /**
   * Tạm tính chi phí đặt chỗ theo workspace, resource và khoảng thời gian.
   */
  async calculateBookingPrice(payload: CalculatePricePayload): Promise<PriceCalculationResult> {
    return apiClient.post<PriceCalculationResult>('/bookings/calculate-price', payload);
  },

  /**
   * Tạo đơn đặt chỗ mới và giữ chỗ 15 phút.
   */
  async createBooking(payload: CreateBookingPayload): Promise<BookingDto> {
    return apiClient.post<BookingDto>('/bookings', payload);
  },

  /**
   * Xem chi tiết đơn đặt chỗ theo ID.
   */
  async getBookingById(id: number | string): Promise<BookingDto> {
    return apiClient.get<BookingDto>(`/bookings/${id}`);
  },

  /**
   * Xem chi tiết đơn đặt chỗ theo mã Booking Code.
   */
  async getBookingByCode(bookingCode: string): Promise<BookingDto> {
    return apiClient.get<BookingDto>(`/bookings/code/${encodeURIComponent(bookingCode)}`);
  },

  /**
   * Xem trước chính sách hủy và số tiền hoàn dự kiến trước khi hủy.
   */
  async getCancellationPreview(bookingId: number | string): Promise<BookingCancellationPreviewDto> {
    return apiClient.get<BookingCancellationPreviewDto>(`/bookings/${bookingId}/cancellation-preview`);
  },

  /**
   * Hủy đơn đặt chỗ hoặc hủy giữ chỗ 15 phút.
   */
  async cancelBooking(bookingId: number | string, reason?: string): Promise<BookingDto> {
    const url = `/bookings/${bookingId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
    return apiClient.post<BookingDto>(url);
  },

  /**
   * Organizer phê duyệt đơn đặt chỗ đang ở trạng thái chờ duyệt (PENDING_APPROVAL).
   */
  async approveBooking(bookingId: number | string): Promise<BookingDto> {
    return apiClient.post<BookingDto>(`/bookings/${bookingId}/approve`);
  },

  /**
   * Organizer từ chối duyệt đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL) kèm lý do.
   */
  async rejectBooking(bookingId: number | string, reason?: string): Promise<BookingDto> {
    const url = `/bookings/${bookingId}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
    return apiClient.post<BookingDto>(url);
  },

  /**
   * Lấy danh sách lịch sử đặt chỗ của khách hàng đang đăng nhập với bộ lọc trạng thái và phân trang.
   */
  async getMyBookings(params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<{ content: BookingDto[]; totalElements: number; totalPages: number; page: number; size: number }> {
    return apiClient.get('/bookings/my', {
      params: {
        status: params?.status === 'ALL' ? undefined : params?.status,
        page: params?.page,
        size: params?.size
      }
    });
  },

  /**
   * Organizer lấy danh sách đơn đặt chỗ theo workspace, ngày và trạng thái.
   */
  async getOrganizerBookings(params?: {
    workspaceId?: number;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<{ content: BookingDto[]; totalElements: number; totalPages: number; page: number; size: number }> {
    return apiClient.get('/bookings/organizer', {
      params: {
        workspaceId: params?.workspaceId && params.workspaceId > 0 ? params.workspaceId : undefined,
        status: params?.status === 'ALL' ? undefined : params?.status,
        date: params?.date,
        startDate: params?.startDate,
        endDate: params?.endDate,
        search: params?.search,
        page: params?.page,
        size: params?.size
      }
    });
  },

  /**
   * Organizer xem danh sách booking dạng sự kiện cho Calendar / Gantt Timeline.
   */
  async getOrganizerCalendarEvents(params?: {
    workspaceId?: number;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<BookingDto[]> {
    return apiClient.get('/bookings/organizer/calendar', {
      params: {
        workspaceId: params?.workspaceId && params.workspaceId > 0 ? params.workspaceId : undefined,
        status: params?.status === 'ALL' ? undefined : params?.status,
        date: params?.date,
        startDate: params?.startDate,
        endDate: params?.endDate
      }
    });
  },

  /**
   * Lấy danh sách đơn đặt chỗ thuộc về một Workspace (dành cho Organizer/Admin).
   */
  async getWorkspaceBookings(
    workspaceId: number | string,
    page?: number,
    size?: number
  ): Promise<{ content: BookingDto[]; totalElements: number; totalPages: number }> {
    return apiClient.get(`/bookings/workspace/${workspaceId}`, {
      params: { page, size }
    });
  },

  /**
   * Lấy danh sách toàn bộ đơn đặt chỗ trên sàn (dành cho Admin).
   */
  async getAllBookings(
    page?: number,
    size?: number
  ): Promise<{ content: BookingDto[]; totalElements: number; totalPages: number }> {
    return apiClient.get('/bookings/admin/all', {
      params: { page, size }
    });
  },

  /**
   * Tra cứu trạng thái chỗ trống trên sơ đồ tầng trong khung thời gian.
   */
  async getWorkspaceAvailability(
    workspaceId: number,
    startTime: string,
    endTime: string,
    floorId?: number
  ): Promise<ResourceAvailabilityItem[]> {
    const params: Record<string, string | number | undefined> = {
      startTime,
      endTime
    };
    if (floorId !== undefined) params.floorId = floorId;
    return apiClient.get<ResourceAvailabilityItem[]>(`/public/workspaces/${workspaceId}/availability`, {
      params
    });
  }
};
