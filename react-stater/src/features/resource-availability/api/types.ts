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

/**
 * Thông tin khả dụng của phòng làm việc/họp (Room) phục vụ giao diện người dùng.
 */
export interface RoomAvailabilityResponseDto {
  roomId: number;
  label: string;
  name: string | null;
  zoneName: string | null;
  capacity: number;
  pricePerHour: number | null;
  status: ResourceOccupancyStatus;
  holdExpiresAt: string | null;
  isOccupiedByMe: boolean;
  hasConflictingDesks: boolean;
  occupiedChildDeskCount: number;
  isCleaningInProgress?: boolean;
  nextAvailableAt?: string | null;
  cleaningBufferMinutes?: number | null;
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
}

/**
 * Tham số tra cứu phòng trống theo thời gian thực.
 */
export interface RoomAvailabilityParams {
  workspaceId: number;
  floorPlanId?: number;
  startTime: string; // ISO 8601 (VD: '2026-11-13T14:00:00')
  endTime: string;   // ISO 8601 (VD: '2026-11-13T16:00:00')
  minCapacity?: number;
}

/**
 * Yêu cầu giữ chỗ tạm thời (Temporary Hold Engine).
 */
export interface HoldResourceRequestDto {
  resourceId: number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  partySize?: number;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
  notes?: string;
}

/**
 * Thông tin phản hồi giữ chỗ tạm thời kèm countdown serverTime và cờ Idempotent Reuse.
 */
export interface HoldResourceResponseDto {
  bookingId: number;
  bookingCode: string;
  resourceId: number;
  resourceName: string;
  workspaceId: number;
  workspaceName: string;
  startTime: string;
  endTime: string;
  holdExpiresAt: string;
  serverTime: string;
  ttlSeconds: number;
  holdDurationMinutes?: number;
  isReused: boolean;
  baseAmount: number;
  finalPrice: number;
  currency: string;
  remainingHoldAttempts?: number;
  maxHoldAttempts?: number;
  penaltyBlockMinutes?: number;
}

/**
 * Kiểu sự kiện thay đổi trạng thái khả dụng của tài nguyên thời gian thực.
 */
export type ResourceAvailabilityEventType =
  | 'HOLD_CREATED'
  | 'HOLD_EXPIRED'
  | 'HOLD_RELEASED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'RESOURCE_BLOCKED'
  | 'RESOURCE_UNBLOCKED'
  | 'RESOURCE_STATUS_CHANGED';

/**
 * DTO dữ liệu sự kiện thay đổi khả dụng của tài nguyên qua luồng SSE hoặc WebSocket.
 */
export interface ResourceAvailabilityEventPayloadDto {
  workspaceId: number;
  resourceId: number;
  resourceLabel: string;
  parentRoomId: number | null;
  bookingId: number | null;
  bookingCode: string | null;
  customerId: number | null;
  newStatus: ResourceOccupancyStatus;
  eventType: ResourceAvailabilityEventType;
  startTime: string;
  endTime: string;
  holdExpiresAt: string | null;
  occurredAt: string;
}




