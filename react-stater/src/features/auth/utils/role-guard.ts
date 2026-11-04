import type { UserDto } from '../api/types';

export type AppRole = 'ADMIN' | 'ORGANIZER' | 'USER';

/**
 * Extracts and normalizes the user's system role.
 * Mapping:
 * - ADMIN / ROLE_ADMIN -> 'ADMIN'
 * - ORGANIZER / ROLE_ORGANIZER -> 'ORGANIZER'
 * - USER / CUSTOMER / other -> 'USER'
 */
export function getUserRole(user: UserDto | null | undefined): AppRole {
  if (!user) return 'USER';
  const roles = user.roles || (user.role ? [user.role] : []);
  const normalized = roles.map((r) => String(r).toUpperCase());
  if (normalized.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN')) {
    return 'ADMIN';
  }
  if (normalized.some((r) => r === 'ORGANIZER' || r === 'ROLE_ORGANIZER')) {
    return 'ORGANIZER';
  }
  return 'USER';
}

export interface RouteAccessCheck {
  allowed: boolean;
  redirectUrl?: string;
  reason?: string;
}

/**
 * Validates route access based on authentication state and user role.
 *
 * Rules:
 * 1. General/User routes: accessible by ALL 3 roles (ADMIN, ORGANIZER, USER).
 * 2. Admin routes (/dashboard/admin/*): accessible ONLY by ADMIN.
 *    - ORGANIZER is blocked -> redirect to /dashboard/organizer/workspaces.
 *    - USER is blocked -> redirect to /dashboard/overview.
 * 3. Organizer routes (/dashboard/organizer/*): accessible ONLY by ORGANIZER.
 *    - ADMIN is blocked -> redirect to /dashboard/overview.
 *    - USER is blocked -> redirect to /dashboard/overview.
 * 4. All /dashboard/* routes require active authentication.
 */
export function checkRouteAccess(
  pathname: string,
  isAuthenticated: boolean,
  user: UserDto | null | undefined
): RouteAccessCheck {
  // Public pages outside of /dashboard are accessible by anyone
  if (!pathname.startsWith('/dashboard')) {
    return { allowed: true };
  }

  // Unauthenticated users attempting to access dashboard
  if (!isAuthenticated || !user) {
    return {
      allowed: false,
      redirectUrl: `/auth/sign-in?redirect=${encodeURIComponent(pathname)}`,
      reason: 'Please sign in to access the dashboard.'
    };
  }

  const role = getUserRole(user);

  // Admin routes: ONLY ADMIN
  if (pathname.startsWith('/dashboard/admin')) {
    if (role === 'ADMIN') {
      return { allowed: true };
    }
    if (role === 'ORGANIZER') {
      return {
        allowed: false,
        redirectUrl: '/dashboard/organizer/workspaces',
        reason: 'Access Denied: You do not have administrator permissions.'
      };
    }
    return {
      allowed: false,
      redirectUrl: '/dashboard/overview',
      reason: 'Access Denied: You do not have administrator permissions.'
    };
  }

  // Organizer routes: ONLY ORGANIZER
  if (pathname.startsWith('/dashboard/organizer')) {
    if (role === 'ORGANIZER') {
      return { allowed: true };
    }
    if (role === 'ADMIN') {
      return {
        allowed: false,
        redirectUrl: '/dashboard/overview',
        reason: 'Access Denied: Administrators cannot access the organizer console.'
      };
    }
    return {
      allowed: false,
      redirectUrl: '/dashboard/overview',
      reason: 'Access Denied: Organizer permissions required.'
    };
  }

  // Common/User routes under /dashboard/* (e.g. /dashboard/overview, /dashboard/settings, /dashboard/notifications, /dashboard/chat, etc.)
  // Accessible by all 3 roles: ADMIN, ORGANIZER, USER
  return { allowed: true };
}

