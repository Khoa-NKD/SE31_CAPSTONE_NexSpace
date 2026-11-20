import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api-client';
import { availabilityKeys } from '../api/queries';
import type { ResourceAvailabilityEventPayloadDto } from '../api/types';

export interface UseRealtimeResourceStatusOptions {
  /**
   * Bật hoặc tắt kết nối SSE stream (mặc định: true nếu có workspaceId).
   */
  enabled?: boolean;

  /**
   * Hàm callback được gọi ngay khi nhận sự kiện thay đổi khả dụng từ máy chủ.
   */
  onResourceChange?: (payload: ResourceAvailabilityEventPayloadDto) => void;
}

/**
 * Hook lắng nghe luồng sự kiện thời gian thực (Server-Sent Events - SSE) từ máy chủ
 * về tình trạng khả dụng của chỗ ngồi và phòng họp trong không gian làm việc.
 *
 * Tự động làm mới dữ liệu cache (invalidation) và kích hoạt phản ứng giao diện tức thời.
 */
export function useRealtimeResourceStatus(
  workspaceId?: number,
  options?: UseRealtimeResourceStatusOptions
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<ResourceAvailabilityEventPayloadDto | null>(null);

  // Giữ tham chiếu ổn định tới callback để tránh tạo lại kết nối khi callback re-render
  const onResourceChangeRef = useRef(options?.onResourceChange);
  useEffect(() => {
    onResourceChangeRef.current = options?.onResourceChange;
  }, [options?.onResourceChange]);

  const isEnabled = (options?.enabled ?? true) && Boolean(workspaceId);

  useEffect(() => {
    if (!isEnabled || !workspaceId || typeof window === 'undefined') {
      return;
    }

    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const streamUrl = `${baseUrl}/public/availability/stream?workspaceId=${workspaceId}`;

    const eventSource = new EventSource(streamUrl);

    const handleOpen = () => {
      setIsConnected(true);
    };

    const handleInit = () => {
      setIsConnected(true);
    };

    const handleAvailabilityChange = (event: MessageEvent) => {
      try {
        const payload: ResourceAvailabilityEventPayloadDto = JSON.parse(event.data);
        setLastEvent(payload);

        // 1. Tự động vô hiệu hoá cache liên quan để đồng bộ lại dữ liệu mới nhất
        queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
        queryClient.invalidateQueries({ queryKey: ['bookings', 'availability'] });
        queryClient.invalidateQueries({ queryKey: ['floor-availability'] });

        // 2. Kích hoạt hàm xử lý phản ứng giao diện (ví dụ: tự động bỏ chọn - auto-deselect)
        if (onResourceChangeRef.current) {
          onResourceChangeRef.current(payload);
        }
      } catch (err) {
        console.error('Lỗi phân tích cú pháp sự kiện SSE RESOURCE_AVAILABILITY_CHANGED:', err);
      }
    };

    const handleError = () => {
      setIsConnected(false);
    };

    eventSource.addEventListener('open', handleOpen);
    eventSource.addEventListener('INIT', handleInit);
    eventSource.addEventListener('RESOURCE_AVAILABILITY_CHANGED', handleAvailabilityChange);
    eventSource.addEventListener('error', handleError);

    return () => {
      eventSource.removeEventListener('open', handleOpen);
      eventSource.removeEventListener('INIT', handleInit);
      eventSource.removeEventListener('RESOURCE_AVAILABILITY_CHANGED', handleAvailabilityChange);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
      setIsConnected(false);
    };
  }, [isEnabled, workspaceId, queryClient]);

  return {
    isConnected,
    lastEvent
  };
}
