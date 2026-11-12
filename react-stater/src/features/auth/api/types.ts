/**
 * Auth Feature Domain & Wire DTO Types
 * Strict parity with Spring Boot 3.5 Backend (base.api.feature.auth.dto)
 */

export type UserGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface UserDto {
  id: number;
  userName: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  gender?: UserGender | null;
  birthDate?: string | null;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'SUSPENDED' | 'INACTIVE' | 'DELETED';
  role?: string;
  roles?: string[];
  avatar?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: string;
  user: UserDto;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface InitiateForgotPasswordRequest {
  contactInfo: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  contactInfo: string;
  message: string;
}

export interface CompleteForgotPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}
