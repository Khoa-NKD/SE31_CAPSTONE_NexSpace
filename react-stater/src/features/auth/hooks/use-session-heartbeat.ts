import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useAuthStore } from '../store/auth-store';
import { apiClient, ApiError } from '@/lib/api-client';
import { broadcastAuthSync, subscribeAuthSync } from '../utils/auth-sync';
import { toast } from 'sonner';

const HEARTBEAT_INTERVAL_MS = 4000; // 4 giây

export function useSessionHeartbeat() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isTerminatingRef = useRef(false);

  const handleSessionTerminated = useCallback(
    (reason: string) => {
      if (isTerminatingRef.current) return;
      isTerminatingRef.current = true;

      clearAuth();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_redirect_reason', reason);
        broadcastAuthSync({ type: 'SESSION_REVOKED', reason });

        const currentPath = window.location.pathname;
        if (
          !currentPath.startsWith('/auth/sign-in') &&
          !currentPath.startsWith('/auth/login') &&
          !currentPath.startsWith('/auth/sign-up')
        ) {
          toast.error('Phiên làm việc đã bị thu hồi', {
            description: reason
          });
          // Điều hướng SPA mượt mà qua TanStack Router về /auth/sign-in mà không tải lại trang
          try {
            router.navigate({
              to: '/auth/sign-in',
              search: { redirect: currentPath } as unknown as Record<string, string>
            });
          } catch {
            window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(currentPath)}`;
          }
        }
      }
    },
    [clearAuth, router]
  );

  useEffect(() => {
    // 1. Lắng nghe tín hiệu đồng bộ giữa các tab (Cross-Tab Synchronization)
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'SESSION_REVOKED') {
        const reason = event.reason || 'Vai trò tài khoản đã thay đổi. Vui lòng đăng nhập lại.';
        handleSessionTerminated(reason);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleSessionTerminated]);

  useEffect(() => {
    if (!isAuthenticated) {
      isTerminatingRef.current = false;
      return;
    }

    const checkHeartbeat = async () => {
      // Tiết kiệm tài nguyên: chỉ kiểm tra khi tab đang hiển thị
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      try {
        const data = await apiClient.get<{ userId: number; role: string; status: string }>('/auth/heartbeat');
        // Đối chiếu vai trò hiện tại với vai trò trong store
        if (data && user && data.role && user.role) {
          const currentStoreRole = user.role.toUpperCase();
          const serverRole = data.role.toUpperCase();
          if (
            currentStoreRole !== serverRole &&
            !serverRole.includes(currentStoreRole) &&
            !currentStoreRole.includes(serverRole)
          ) {
            handleSessionTerminated('Vai trò tài khoản đã được quản trị viên thay đổi. Vui lòng đăng nhập lại.');
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          handleSessionTerminated(
            err.message || 'Phiên làm việc đã hết hạn hoặc vai trò tài khoản đã thay đổi. Vui lòng đăng nhập lại.'
          );
        }
      }
    };

    // Kiểm tra ngay khi khởi động
    checkHeartbeat();

    // Định kỳ gửi nhịp tim ngầm
    const intervalId = setInterval(checkHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Kích hoạt kiểm tra tức thì ngay khi người dùng bấm quay lại tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHeartbeat();
      }
    };

    const handleFocus = () => {
      checkHeartbeat();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, user, handleSessionTerminated]);
}
