import type { PageResponse } from '@/types/api';

export type UserRole = 'Customer' | 'Organizer' | 'Administrator';
export type UserAccountStatus = 'Active' | 'Locked' | 'Inactive';
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
  status: UserAccountStatus;
  reason?: string;
}

export type AdminUsersPageResponse = PageResponse<AdminUserRecord>;
