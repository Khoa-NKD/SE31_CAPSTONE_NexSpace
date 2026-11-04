import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthHeaderProvider } from '../../../lib/api-client.ts';
import type { UserDto } from '../api/types';

const AUTH_STORAGE_KEY = 'nexspace_auth_session_v1';

export interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: { user: UserDto; accessToken: string }) => void;
  setUser: (user: UserDto) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: ({ user, accessToken }) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false
        }),

      setUser: (user) =>
        set((state) => ({
          ...state,
          user
        })),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Register dynamic token provider with apiClient
setAuthHeaderProvider(() => {
  const token = useAuthStore.getState().accessToken;
  return token ? `Bearer ${token}` : null;
});

export default useAuthStore;

