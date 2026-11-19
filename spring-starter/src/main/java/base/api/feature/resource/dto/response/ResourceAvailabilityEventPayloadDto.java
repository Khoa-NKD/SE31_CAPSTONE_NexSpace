package base.api.feature.resource.dto.response;

import base.api.feature.resource.event.ResourceAvailabilityEventType;
import base.api.shared.enums.ResourceOccupancyStatus;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.time.LocalDateTime;

/**
 * DTO dữ liệu sự kiện thay đổi trạng thái khả dụng của tài nguyên.
 * Định dạng chuẩn hóa phục vụ đồng bộ dữ liệu qua SSE hoặc WebSocket.
 */
@Value
@Builder
@Jacksonized
public class ResourceAvailabilityEventPayloadDto {
    Long workspaceId;
    Long resourceId;
    String resourceLabel;
    Long parentRoomId;
    Long bookingId;
    String bookingCode;
    Long customerId;
    ResourceOccupancyStatus newStatus;
    ResourceAvailabilityEventType eventType;
    LocalDateTime startTime;
    LocalDateTime endTime;
    LocalDateTime holdExpiresAt;
    LocalDateTime occurredAt;
}

