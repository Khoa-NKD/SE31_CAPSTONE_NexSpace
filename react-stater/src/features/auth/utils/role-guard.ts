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

/**
 * Trả về URL trang đầu tiên khi đăng nhập thành công tương ứng với từng Role:
 * - ADMIN -> /dashboard/overview
 * - ORGANIZER -> /dashboard/organizer/workspaces
 * - CUSTOMER (USER) / Khách -> / (Trang chủ Landing Page)
 */
export function getRoleHomeUrl(user: UserDto | null | undefined): string {
  const role = getUserRole(user);
  if (role === 'ADMIN') return '/dashboard/overview';
  if (role === 'ORGANIZER') return '/dashboard/organizer/workspaces';
  return '/';
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
 * 1. Customer (USER):
 *    - BỊ CHẶN hoàn toàn khỏi trang quản trị (/dashboard, /dashboard/overview, /dashboard/admin/*, /dashboard/organizer/*).
 *    - Chỉ được phép truy cập hồ sơ & cài đặt cá nhân (/dashboard/settings, /dashboard/profile, /dashboard/notifications).
 *    - Nếu cố tình truy cập vào dashboard quản trị, bị redirect về Landing page ('/').
 * 2. Admin routes (/dashboard/admin/*):
 *    - Accessible ONLY by ADMIN.
 *    - ORGANIZER is blocked -> redirect to /dashboard/organizer/workspaces.
 * 3. Organizer routes (/dashboard/organizer/*):
 *    - Accessible ONLY by ORGANIZER.
 *    - ADMIN is blocked -> redirect to /dashboard/overview.
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

  // 1. CUSTOMER (USER) RESTRICTION:
  // Khách hàng không được vào dashboard quản trị (Admin/Organizer/Overview).
  // Chỉ được vào xem/cập nhật hồ sơ & cài đặt của mình.
  if (role === 'USER') {
    const allowedCustomerPaths = ['/dashboard/settings', '/dashboard/profile', '/dashboard/notifications'];
    const isAllowed = allowedCustomerPaths.some(
      (allowedPath) => pathname === allowedPath || pathname.startsWith(allowedPath + '/')
    );

    if (!isAllowed) {
      return {
        allowed: false,
        redirectUrl: '/',
        reason: 'Khách hàng không có quyền truy cập vào trang quản trị (Dashboard).'
      };
    }
    return { allowed: true };
  }

  // 2. ADMIN ROUTES: ONLY ADMIN
  if (pathname.startsWith('/dashboard/admin')) {
    if (role === 'ADMIN') {
      return { allowed: true };
    }
    return {
      allowed: false,
      redirectUrl: '/dashboard/organizer/workspaces',
      reason: 'Access Denied: You do not have administrator permissions.'
    };
  }

  // 3. ORGANIZER APPLICATION SPECIAL CASE
  if (
    (pathname === '/dashboard/organizer/application' ||
      pathname === '/dashboard/organizer/application/') &&
    role === 'USER'
  ) {
    return { allowed: false, redirectUrl: '/organizer/apply' };
  }

  // 4. ORGANIZER OPERATIONAL ROUTES: ONLY ORGANIZER
  if (pathname.startsWith('/dashboard/organizer')) {
    if (role === 'ORGANIZER') {
      return { allowed: true };
    }
    return {
      allowed: false,
      redirectUrl: '/dashboard/overview',
      reason: 'Access Denied: Administrators cannot access the organizer console.'
    };
  }

  // 5. ADMIN OVERVIEW ROUTE: ONLY ADMIN
  if (pathname === '/dashboard/overview' || pathname === '/dashboard/overview/') {
    if (role === 'ADMIN') {
      return { allowed: true };
    }
    if (role === 'ORGANIZER') {
      return {
        allowed: false,
        redirectUrl: '/dashboard/organizer/workspaces',
        reason: 'Access Denied: Organizer redirected to organizer console.'
      };
    }
  }

  return { allowed: true };
}
