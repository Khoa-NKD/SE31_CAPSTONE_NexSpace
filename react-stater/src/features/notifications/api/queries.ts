import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PageResponse } from '@/types/api';
import { useAuthStore } from '@/features/auth/store/auth-store';

export type NotificationType =
  | 'BOOKING'
  | 'PAYMENT'
  | 'REFUND'
  | 'ORGANIZER_APPLICATION'
  | 'WORKSPACE_REVIEW'
  | 'MEMBERSHIP'
  | 'PROMOTION'
  | 'SYSTEM'
  | 'COMPLAINT';

export interface UserNotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const NOTIFICATION_QUERY_KEYS = {
  all: (userId?: number | string | null) => ['customer', 'notifications', userId ?? 'anonymous'] as const,
  list: (userId?: number | string | null, params?: { page?: number; size?: number; unreadOnly?: boolean }) =>
    [...NOTIFICATION_QUERY_KEYS.all(userId), 'list', params] as const,
  unreadCount: (userId?: number | string | null) =>
    [...NOTIFICATION_QUERY_KEYS.all(userId), 'unread-count'] as const
};

export function useCustomerNotificationsQuery(params?: {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}) {
  const { page = 1, size = 10, unreadOnly, enabled = true } = params || {};
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<PageResponse<UserNotificationDto>>({
    queryKey: NOTIFICATION_QUERY_KEYS.list(user?.id, { page, size, unreadOnly }),
    queryFn: async () => {
      return apiClient.get<PageResponse<UserNotificationDto>>('/v1/customer/notifications', {
        params: {
          page,
          size,
          unreadOnly: unreadOnly !== undefined ? unreadOnly : undefined
        }
      });
    },
    enabled: enabled && isAuthenticated && Boolean(user?.id),
    refetchInterval: 15000,
    staleTime: 5000
  });
}

export function useUnreadNotificationCountQuery(enabled: boolean = true) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<number>({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(user?.id),
    queryFn: async () => {
      const res = await apiClient.get<UnreadCountResponse>('/v1/customer/notifications/unread-count');
      return res.unreadCount ?? 0;
    },
    enabled: enabled && isAuthenticated && Boolean(user?.id),
    refetchInterval: 10000,
    staleTime: 5000
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch<void>(`/v1/customer/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
    }
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async () => {
      return apiClient.patch<void>('/v1/customer/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
    }
  });
}

export function useMarkBatchNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (notificationIds: number[]) => {
      return apiClient.patch<void>('/v1/customer/notifications/batch-read', notificationIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
    }
  });
}
