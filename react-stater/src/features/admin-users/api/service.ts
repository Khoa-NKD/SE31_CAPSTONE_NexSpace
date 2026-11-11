import { apiClient } from '@/lib/api-client';
import type {
  AdminUserRecord,
  AdminUserFilters,
  UpdateUserStatusPayload,
  UpdateUserRolePayload,
  AdminUsersPageResponse,
  RawAdminUserInput,
  RawAdminUsersPageInput,
  UserRole,
  UserAccountStatus,
  UserKycStatus
} from './types';

/**
 * Lấy 1 chữ cái đầu tiên trong tên hoặc email của người dùng để làm avatar mặc định.
 * Hỗ trợ Unicode / tiếng Việt và tự động viết hoa (ví dụ: "Phong" -> "P", "Trần" -> "T").
 */
export function getUserInitial(name?: string, email?: string): string {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const nameToUse = cleanName.includes('@') ? cleanName.split('@')[0] : cleanName;
    const match = nameToUse.match(/[\p{L}\p{N}]/u);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  const cleanEmail = (email || '').trim();
  if (cleanEmail) {
    const emailPrefix = cleanEmail.split('@')[0];
    const match = emailPrefix.match(/[\p{L}\p{N}]/u);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  return 'U';
}

/**
 * Chuẩn hóa dữ liệu trả về từ Backend (UserDto) hoặc Mock Server thành AdminUserRecord
 * Đảm bảo hiển thị đầy đủ họ tên, avatar, ngày đăng ký, vai trò và trạng thái.
 */
export function normalizeAdminUserRecord(raw: RawAdminUserInput): AdminUserRecord {
  const id = String(raw.id ?? '');

  // Trích xuất họ tên hiển thị: ưu tiên fullName -> ghép first & last name -> userName -> email
  const fullNameCandidate =
    raw.fullName ||
    (raw.firstName || raw.lastName
      ? `${raw.firstName || ''} ${raw.lastName || ''}`.trim()
      : '') ||
    raw.name ||
    raw.userName ||
    (raw.email ? raw.email.split('@')[0] : `User #${id}`);

  const legalName = raw.legalName || raw.fullName || fullNameCandidate;
  const email = raw.email || '';
  const phone = raw.phone || 'Chưa cập nhật';

  // Chuẩn hóa vai trò (Role): USER / ORGANIZER / ADMIN -> Customer / Organizer / Administrator
  let role: UserRole = 'Customer';
  const rawRole = String(raw.role || '').toUpperCase();
  if (rawRole === 'ADMIN' || rawRole === 'ADMINISTRATOR') {
    role = 'Administrator';
  } else if (rawRole === 'ORGANIZER') {
    role = 'Organizer';
  } else if (rawRole === 'USER' || rawRole === 'CUSTOMER') {
    role = 'Customer';
  } else if (raw.role === 'Organizer' || raw.role === 'Administrator' || raw.role === 'Customer') {
    role = raw.role;
  }

  // Chuẩn hóa trạng thái tài khoản (Status): ACTIVE / LOCKED / INACTIVE / DELETED
  let status: UserAccountStatus = 'Active';
  const rawStatus = String(raw.status || '').toUpperCase();
  if (rawStatus === 'LOCKED') {
    status = 'Locked';
  } else if (rawStatus === 'INACTIVE') {
    status = 'Inactive';
  } else if (rawStatus === 'DELETED') {
    status = 'Deleted';
  } else if (rawStatus === 'ACTIVE') {
    status = 'Active';
  }

  // Chuẩn hóa trạng thái xác minh KYC
  let kycStatus: UserKycStatus = 'Unverified';
  if (raw.verified === true || raw.isVerified === true || raw.kycStatus === 'Verified KYC') {
    kycStatus = 'Verified KYC';
  } else if (raw.kycStatus === 'Pending KYC') {
    kycStatus = 'Pending KYC';
  }

  // Đơn vị / tổ chức (Company)
  const company =
    raw.company ||
    (role === 'Organizer'
      ? 'Nhà tổ chức không gian'
      : role === 'Administrator'
        ? 'Quản trị viên NexSpace'
        : 'Thành viên NexSpace');

  // Ngày đăng ký (Created / Registered Date)
  const createdDate = raw.createdAt ? new Date(raw.createdAt) : null;
  const registeredDate =
    raw.registeredDate ||
    (createdDate && !isNaN(createdDate.getTime())
      ? createdDate.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '—');

  const registeredTimeUtc =
    raw.registeredTimeUtc ||
    (createdDate && !isNaN(createdDate.getTime())
      ? createdDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '');

  // Ảnh đại diện: nếu chưa có avatar từ server thì để rỗng để hiển thị avatar mặc định với 1 chữ cái đầu
  const avatarUrl = (raw.avatar || raw.avatarUrl || '').trim();

  return {
    id,
    userName: raw.userName,
    fullName: raw.fullName,
    createdAt: raw.createdAt,
    verified: raw.verified ?? raw.isVerified,
    name: fullNameCandidate,
    legalName,
    email,
    phone,
    company,
    role,
    status,
    kycStatus,
    registeredDate,
    registeredTimeUtc,
    avatarUrl,
    registrationIp: raw.registrationIp || '127.0.0.1',
    timezone: raw.timezone || 'Asia/Ho_Chi_Minh (UTC+07)',
    twoFactorEnabled: !!raw.twoFactorEnabled,
    twoFactorMethod: raw.twoFactorMethod || (raw.twoFactorEnabled ? 'TOTP Authenticator' : 'Disabled'),
    lastLogin: raw.lastLoginAt
      ? new Date(raw.lastLoginAt).toLocaleString('vi-VN')
      : raw.lastLogin || 'Chưa có thông tin',
    clientFingerprint: raw.clientFingerprint || 'FP-BROWSER-SECURE',
    consecutiveFailedLogins: raw.consecutiveFailedLogins ?? raw.failedLoginCount ?? 0,
    sessionRootKey: raw.sessionRootKey || `sec_key_${id}`,
    passwordLastChanged:
      raw.passwordLastChanged ||
      (raw.updatedAt ? new Date(raw.updatedAt).toLocaleDateString('vi-VN') : '—'),
    stats: raw.stats || {
      totalBookings: 0,
      gmvAmount: '0 ₫',
      activeEscrows: 0,
      escrowHoldAmount: '0 ₫',
      disputesCount: 0
    },
    activityLogs: raw.activityLogs || []
  };
}

/**
 * Fetch paginated & filtered admin users list.
 * Communicates with REST endpoint GET /api/admin/users
 */
export async function getAdminUsers(
  filters?: AdminUserFilters
): Promise<AdminUsersPageResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters?.search) params.search = filters.search;
  if (filters?.role && filters.role !== 'all') {
    const r = filters.role.toUpperCase();
    params.role = r === 'CUSTOMER' ? 'USER' : r === 'ADMINISTRATOR' ? 'ADMIN' : r;
  }
  if (filters?.status && filters.status !== 'all') {
    params.status = filters.status.toUpperCase();
  }
  if (filters?.kyc && filters.kyc !== 'all') params.kyc = filters.kyc;
  if (filters?.page !== undefined) params.page = filters.page;
  if (filters?.size !== undefined) params.size = filters.size;
  if (filters?.sort) params.sort = filters.sort;

  const res = await apiClient.get<RawAdminUsersPageInput | RawAdminUserInput[]>('/admin/users', { params });

  const isArr = Array.isArray(res);
  const rawList = isArr ? res : (res?.content ?? res?.listObjects ?? []);
  const normalizedContent: AdminUserRecord[] = rawList.map(normalizeAdminUserRecord);

  const pageMeta = isArr ? undefined : res;

  return {
    content: normalizedContent,
    page: pageMeta?.page ?? pageMeta?.pageNumber ?? 0,
    size: pageMeta?.size ?? pageMeta?.pageSize ?? normalizedContent.length,
    totalElements: pageMeta?.totalElements ?? pageMeta?.totalRecords ?? normalizedContent.length,
    totalPages: pageMeta?.totalPages ?? (normalizedContent.length > 0 ? 1 : 0),
    first: pageMeta?.first ?? (pageMeta?.page === 0),
    last: pageMeta?.last ?? true,
    empty: pageMeta?.empty ?? (normalizedContent.length === 0)
  };
}

/**
 * Fetch a single admin user by ID.
 * Communicates with REST endpoint GET /api/admin/users/:id
 */
export async function getAdminUserById(id: string): Promise<AdminUserRecord> {
  const res = await apiClient.get<RawAdminUserInput>(`/admin/users/${id}`);
  return normalizeAdminUserRecord(res);
}

/**
 * Update an admin user's moderation status (Lock / Unlock / Inactive / Deleted).
 * Communicates with REST endpoint PATCH /api/v1/admin/users/:id/status
 */
export async function updateAdminUserStatus(
  id: string,
  payload: UpdateUserStatusPayload
): Promise<AdminUserRecord> {
  const normalizedPayload = {
    ...payload,
    status: String(payload.status).toUpperCase()
  };
  const res = await apiClient.patch<RawAdminUserInput>(`/admin/users/${id}/status`, normalizedPayload);
  return normalizeAdminUserRecord(res);
}

/**
 * Update an admin user's role (USER / ORGANIZER / ADMIN).
 * Communicates with REST endpoint PATCH /admin/users/:id/role
 */
export async function updateAdminUserRole(
  id: string,
  payload: UpdateUserRolePayload
): Promise<AdminUserRecord> {
  const res = await apiClient.patch<RawAdminUserInput>(`/admin/users/${id}/role`, payload);
  return normalizeAdminUserRecord(res);
}
