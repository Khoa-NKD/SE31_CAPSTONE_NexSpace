import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthHeaderProvider, setUnauthorizedHandler } from '../../../lib/api-client.ts';
import { spaNavigate } from '../../../lib/spa-navigation.ts';
import { broadcastAuthSync } from '../utils/auth-sync.ts';
import type { UserDto } from '../api/types';

const AUTH_STORAGE_KEY = 'nexspace_auth_session_v1';

export interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminViewMode: 'admin' | 'customer';
  setAuth: (data: { user: UserDto; accessToken: string }) => void;
  setUser: (user: UserDto) => void;
  setAdminViewMode: (mode: 'admin' | 'customer') => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

const normalizeUser = (user: UserDto | null): UserDto | null => {
  if (!user) return null;
  const effectiveAvatar = user.avatar || user.avatarUrl || null;
  return {
    ...user,
    avatar: effectiveAvatar,
    avatarUrl: effectiveAvatar
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      adminViewMode: 'admin',

      setAuth: ({ user, accessToken }) =>
        set({
          user: normalizeUser(user),
          accessToken,
          isAuthenticated: true,
          isLoading: false,
          adminViewMode: 'admin'
        }),

      setUser: (user) =>
        set((state) => ({
          ...state,
          user: normalizeUser(user)
        })),

      setAdminViewMode: (mode) =>
        set({
          adminViewMode: mode
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          adminViewMode: 'admin'
        }),

      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      })),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.user = normalizeUser(state.user);
        }
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        adminViewMode: state.adminViewMode
      })
    }
  )
);

// Register dynamic token provider with apiClient
setAuthHeaderProvider(() => {
  const token = useAuthStore.getState().accessToken;
  return token ? `Bearer ${token}` : null;
});

// Register dynamic 401 handler for immediate logout & cross-device session termination
setUnauthorizedHandler((status, message) => {
  const state = useAuthStore.getState();
  if (state.isAuthenticated) {
    state.clearAuth();
    if (typeof window !== 'undefined') {
      const reason =
        message ||
        'Phiên làm việc đã hết hạn hoặc vai trò tài khoản đã thay đổi. Vui lòng đăng nhập lại.';
      sessionStorage.setItem('auth_redirect_reason', reason);
      broadcastAuthSync({ type: 'SESSION_REVOKED', reason });

      if (
        !window.location.pathname.startsWith('/auth/sign-in') &&
        !window.location.pathname.startsWith('/auth/login') &&
        !window.location.pathname.startsWith('/auth/sign-up')
      ) {
        const currentPath = window.location.pathname + window.location.search;
        spaNavigate(`/auth/sign-in?redirect=${encodeURIComponent(currentPath)}`);
      }
    }
  }
});

export default useAuthStore;

