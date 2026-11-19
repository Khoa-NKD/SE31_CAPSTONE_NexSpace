import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PageResponse } from '@/types/api';

export type NotificationType =
  | 'BOOKING'
  | 'PAYMENT'
  | 'REFUND'
  | 'ORGANIZER_APPLICATION'
  | 'WORKSPACE_REVIEW'
  | 'MEMBERSHIP'
  | 'PROMOTION'
  | 'SYSTEM';

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
  all: ['customer', 'notifications'] as const,
  list: (params?: { page?: number; size?: number; unreadOnly?: boolean }) =>
    [...NOTIFICATION_QUERY_KEYS.all, 'list', params] as const,
  unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unread-count'] as const
};

export function useCustomerNotificationsQuery(params?: {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}) {
  const { page = 1, size = 10, unreadOnly, enabled = true } = params || {};

  return useQuery<PageResponse<UserNotificationDto>>({
    queryKey: NOTIFICATION_QUERY_KEYS.list({ page, size, unreadOnly }),
    queryFn: async () => {
      return apiClient.get<PageResponse<UserNotificationDto>>('/v1/customer/notifications', {
        params: {
          page,
          size,
          unreadOnly: unreadOnly !== undefined ? unreadOnly : undefined
        }
      });
    },
    enabled,
    refetchInterval: 15000,
    staleTime: 5000
  });
}

export function useUnreadNotificationCountQuery(enabled: boolean = true) {
  return useQuery<number>({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(),
    queryFn: async () => {
      const res = await apiClient.get<UnreadCountResponse>('/v1/customer/notifications/unread-count');
      return res.unreadCount ?? 0;
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch<void>(`/v1/customer/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    }
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.patch<void>('/v1/customer/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    }
  });
}

export function useMarkBatchNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: number[]) => {
      return apiClient.patch<void>('/v1/customer/notifications/batch-read', notificationIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    }
  });
}
