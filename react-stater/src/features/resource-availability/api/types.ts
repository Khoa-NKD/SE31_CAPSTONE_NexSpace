/**
 * Trạng thái chiếm chỗ thời gian thực của tài nguyên.
 */
export type ResourceOccupancyStatus =
  | 'AVAILABLE'
  | 'HOLDING'
  | 'BOOKED'
  | 'BLOCKED'
  | 'DISABLED';

/**
 * Thông tin khả dụng của chỗ ngồi (Desk) phục vụ giao diện người dùng.
 */
export interface DeskAvailabilityResponseDto {
  resourceId: number;
  label: string;
  name: string | null;
  zoneName: string | null;
  parentRoomId: number | null;
  pricePerHour: number | null;
  status: ResourceOccupancyStatus;
  holdExpiresAt: string | null;
  isOccupiedByMe: boolean;
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
}

/**
 * Tham số tra cứu chỗ trống theo thời gian thực.
 */
export interface DeskAvailabilityParams {
  workspaceId: number;
  floorPlanId?: number;
  startTime: string; // ISO 8601 (VD: '2026-11-13T09:00:00')
  endTime: string;   // ISO 8601 (VD: '2026-11-13T12:00:00')
}

