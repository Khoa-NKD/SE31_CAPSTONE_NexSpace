import { apiClient } from '@/lib/api-client';
import type {
  DeskAvailabilityParams,
  DeskAvailabilityResponseDto,
  HoldResourceRequestDto,
  HoldResourceResponseDto,
  RoomAvailabilityParams,
  RoomAvailabilityResponseDto
} from './types';

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
  },

  /**
   * Tra cứu danh sách phòng làm việc/họp và trạng thái khả dụng theo thời gian thực (kèm xung đột hai chiều với ghế con)
   */
  async getRoomAvailability(params: RoomAvailabilityParams): Promise<RoomAvailabilityResponseDto[]> {
    return apiClient.get<RoomAvailabilityResponseDto[]>('/public/availability/rooms', {
      params: {
        workspaceId: params.workspaceId,
        floorPlanId: params.floorPlanId,
        startTime: params.startTime,
        endTime: params.endTime,
        minCapacity: params.minCapacity
      }
    });
  },

  /**
   * Giữ chỗ tạm thời (Temporary Hold) kèm cơ chế Idempotent Reuse và giới hạn tối đa 3 hold
   */
  async holdResource(payload: HoldResourceRequestDto): Promise<HoldResourceResponseDto> {
    return apiClient.post<HoldResourceResponseDto>('/bookings/hold', payload);
  },

  /**
   * Lấy thông tin phiên giữ chỗ đang có hiệu lực của tài nguyên
   */
  async getActiveHold(resourceId: number): Promise<HoldResourceResponseDto> {
    return apiClient.get<HoldResourceResponseDto>('/bookings/hold', {
      params: { resourceId }
    });
  }
};



