import { ApiError, request } from '../../../lib/api-client.ts';
import { useAuthStore } from '../store/auth-store.ts';
import type { AuthResponse, UserDto } from './types.ts';

export type SessionUser = UserDto;

/** Share the upstream auth store; organizer submission must not maintain a second login session. */
export function clearSession(): void {
  if (typeof window !== 'undefined') useAuthStore.getState().clearAuth();
}

export async function backendRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  authenticated = true,
  signal?: AbortSignal
): Promise<T> {
  const token = typeof window !== 'undefined' ? useAuthStore.getState().accessToken : null;
  if (authenticated && !token) {
    throw new ApiError(401, 'Unauthorized', { message: 'Please sign in to continue.' });
  }
  try {
    return await request<T>(endpoint, method, body, {
      baseUrl: import.meta.env?.VITE_BACKEND_API_URL || '/api',
      headers: authenticated && token ? { Authorization: `Bearer ${token}` } : {},
      signal
    });
  } catch (error) {
    if (authenticated && error instanceof ApiError && error.status === 401) clearSession();
    throw error;
  }
}

/** Compatibility entry point using the same persistence policy as the upstream login form. */
export async function signIn(
  username: string,
  password: string,
  _rememberForTab: boolean
): Promise<SessionUser> {
  if (typeof window === 'undefined') throw new Error('Sign in requires a browser session.');
  const result = await backendRequest<AuthResponse>(
    '/auth/login',
    'POST',
    { username, password },
    false
  );
  useAuthStore.getState().setAuth({ user: result.user, accessToken: result.accessToken });
  return result.user;
}

export function currentUser(signal?: AbortSignal): Promise<SessionUser> {
  return backendRequest<SessionUser>('/auth/me', 'GET', undefined, true, signal);
}
