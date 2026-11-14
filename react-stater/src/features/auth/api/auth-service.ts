import { apiClient, type RequestOptions } from '../../../lib/api-client.ts';
import type {
  AuthResponse,
  ChangePasswordRequest,
  CompleteForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  TokenValidationResponse,
  UpdateProfileRequest,
  UserDto
} from './types';

// Auth targets Spring's /api prefix while unrelated feature modules retain their mock configuration.
const authOptions = (options?: RequestOptions): RequestOptions => ({
  ...options,
  baseUrl: import.meta.env?.VITE_BACKEND_API_URL || '/api'
});
const authApiClient = {
  get: <T>(path: string, options?: RequestOptions) => apiClient.get<T>(path, authOptions(options)),
  post: <T>(path: string, body?: unknown) => apiClient.post<T>(path, body, authOptions()),
  put: <T>(path: string, body?: unknown) => apiClient.put<T>(path, body, authOptions())
};

/**
 * Authentication & Identity Service
 * Connects directly to Spring Boot 3.5 `/api/auth` endpoints
 */
export const authService = {
  /**
   * Log in with username or email + password. Returns JWT and user details.
   */
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    return authApiClient.post<AuthResponse>('/auth/login', payload);
  },

  /**
   * Register a new user account. Returns created user.
   */
  register: async (payload: RegisterRequest): Promise<UserDto> => {
    return authApiClient.post<UserDto>('/auth/register', payload);
  },

  /**
   * Log out current user and invalidate JWT in server-side blacklist.
   */
  logout: async (): Promise<void> => {
    return authApiClient.post<void>('/auth/logout');
  },

  /**
   * Get current authenticated user profile.
   */
  getMe: async (signal?: AbortSignal): Promise<UserDto> => {
    return authApiClient.get<UserDto>('/auth/me', { signal });
  },

  /**
   * Resend account verification email.
   */
  resendVerification: async (contactInfo: string): Promise<void> => {
    return authApiClient.post<void>('/auth/resend-verification', { contactInfo });
  },

  /**
   * Directly verify email using token via JSON POST API.
   */
  verifyEmailDirect: async (token: string): Promise<void> => {
    return authApiClient.post<void>('/auth/verify-email', { token });
  },

  /**
   * Initiate forgot password flow by sending reset token to email.
   */
  initiateForgotPassword: async (contactInfo: string): Promise<void> => {
    return authApiClient.post<void>('/auth/forgot-password/initiate', { contactInfo });
  },

  /**
   * Validate a password reset token before displaying the new password form.
   */
  verifyResetToken: async (token: string): Promise<TokenValidationResponse> => {
    return authApiClient.get<TokenValidationResponse>('/auth/forgot-password/verify-token', {
      params: { token }
    });
  },

  /**
   * Complete password reset using token and new password.
   */
  completeForgotPassword: async (payload: CompleteForgotPasswordRequest): Promise<void> => {
    return authApiClient.post<void>('/auth/forgot-password/complete', payload);
  },

  /**
   * Check whether an email account is verified (for realtime auto-sync).
   */
  checkVerificationStatus: async (email: string): Promise<{ verified: boolean }> => {
    return authApiClient.get<{ verified: boolean }>(
      `/auth/verification-status?email=${encodeURIComponent(email)}`
    );
  },

  /**
   * Change password for the current authenticated user.
   */
  changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
    return authApiClient.post<void>('/auth/change-password', payload);
  },

  /**
   * Update profile information for current authenticated user.
   */
  updateProfile: async (payload: UpdateProfileRequest): Promise<UserDto> => {
    return authApiClient.put<UserDto>('/auth/me', payload);
  }
};

export default authService;
