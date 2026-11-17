import type { PageResponse } from '@/types/api';

export type UserRole = 'Customer' | 'Organizer' | 'Administrator';
export type UserAccountStatus = 'Active' | 'Locked' | 'Inactive' | 'Deleted';
export type UserKycStatus = 'Verified KYC' | 'Pending KYC' | 'Unverified';

export interface UserActivityLog {
  id: string;
  title: string;
  timestamp: string;
  detail: string;
  type: 'booking' | 'payment' | 'security' | 'moderation';
}

export interface AdminUserRecord {
  id: string;
  userName?: string;
  fullName?: string;
  createdAt?: string;
  verified?: boolean;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  company: string;
  role: UserRole;
  status: UserAccountStatus;
  kycStatus: UserKycStatus;
  registeredDate: string;
  registeredTimeUtc: string;
  avatarUrl: string;
  registrationIp: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  lastLogin: string;
  clientFingerprint: string;
  consecutiveFailedLogins: number;
  sessionRootKey: string;
  passwordLastChanged: string;
  stats: {
    totalBookings: number;
    gmvAmount: string;
    activeEscrows: number;
    escrowHoldAmount: string;
    disputesCount: number;
  };
  activityLogs: UserActivityLog[];
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  status?: string;
  kyc?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface UpdateUserStatusPayload {
  status: UserAccountStatus | 'Active' | 'Locked' | 'Inactive' | 'Deleted' | 'ACTIVE' | 'LOCKED' | 'INACTIVE' | 'DELETED';
  reason?: string;
  lockedUntil?: string | null;
}

export type BackendUserRole = 'USER' | 'ORGANIZER' | 'ADMIN' | 'Customer' | 'Organizer' | 'Administrator';

export interface UpdateUserRolePayload {
  role: BackendUserRole;
  reason: string;
}

export interface RawAdminUserInput {
  id?: string | number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  status?: string;
  verified?: boolean;
  isVerified?: boolean;
  kycStatus?: string;
  avatar?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastLogin?: string;
  registeredDate?: string;
  registeredTimeUtc?: string;
  registrationIp?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string;
  clientFingerprint?: string;
  consecutiveFailedLogins?: number;
  failedLoginCount?: number;
  sessionRootKey?: string;
  passwordLastChanged?: string;
  stats?: AdminUserRecord['stats'];
  activityLogs?: UserActivityLog[];
}

export interface RawAdminUsersPageInput {
  content?: RawAdminUserInput[];
  listObjects?: RawAdminUserInput[];
  page?: number;
  pageNumber?: number;
  size?: number;
  pageSize?: number;
  totalElements?: number;
  totalRecords?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export type AdminUsersPageResponse = PageResponse<AdminUserRecord>;
