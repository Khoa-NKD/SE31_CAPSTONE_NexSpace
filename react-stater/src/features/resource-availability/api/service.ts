import { apiClient } from '@/lib/api-client';
import type { DeskAvailabilityParams, DeskAvailabilityResponseDto } from './types';

export const resourceAvailabilityService = {
  /**
   * Tra cứu danh sách bàn làm việc và trạng thái khả dụng theo thời gian thực
   */
  async getDeskAvailability(params: DeskAvailabilityParams): Promise<DeskAvailabilityResponseDto[]> {
    return apiClient.get<DeskAvailabilityResponseDto[]>('/public/availability/desks', {
      params: {
        workspaceId: params.workspaceId,
        floorPlanId: params.floorPlanId,
        startTime: params.startTime,
        endTime: params.endTime
      }
    });
  }
};

