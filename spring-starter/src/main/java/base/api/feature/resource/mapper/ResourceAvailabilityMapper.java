package base.api.feature.resource.mapper;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.ResourceAvailabilityEventPayloadDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.service.ResourceStateResolver;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.ResourceOccupancyStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Bộ ánh xạ dữ liệu (Mapper) tĩnh, thuần túy phục vụ chuẩn hóa trạng thái khả dụng của tài nguyên
 * sang các DTO hiển thị và DTO sự kiện đồng bộ thời gian thực.
 */
public final class ResourceAvailabilityMapper {

    private ResourceAvailabilityMapper() {
        // Utility class
    }

    /**
     * Ánh xạ thông tin bàn làm việc (Desk) và kết quả phân giải sang DeskAvailabilityResponseDto.
     */
    public static DeskAvailabilityResponseDto toDeskResponse(
            BookableResourceModel desk,
            ResourceStateResolver.ResourceResolutionResult resolution,
            Long parentRoomId
    ) {
        if (desk == null) {
            return null;
        }

        ResourceOccupancyStatus status = resolution != null ? resolution.status() : ResourceOccupancyStatus.DISABLED;
        LocalDateTime holdExpiresAt = resolution != null ? resolution.holdExpiresAt() : null;
        boolean isOccupiedByMe = resolution != null && resolution.isOccupiedByMe();

        BigDecimal effectivePricePerHour = desk.getPricePerHour() != null
                ? desk.getPricePerHour()
                : (desk.getResourceType() != null ? desk.getResourceType().getPricePerHour() : null);

        Long effectiveParentRoomId = parentRoomId != null
                ? parentRoomId
                : (desk.getParentRoom() != null ? desk.getParentRoom().getId() : null);

        return DeskAvailabilityResponseDto.builder()
                .resourceId(desk.getId())
                .label(desk.getLabel())
                .name(desk.getName())
                .zoneName(desk.getZoneName())
                .parentRoomId(effectiveParentRoomId)
                .pricePerHour(effectivePricePerHour)
                .status(status)
                .holdExpiresAt(holdExpiresAt)
                .isOccupiedByMe(isOccupiedByMe)
                .posX(desk.getPosX())
                .posY(desk.getPosY())
                .width(desk.getWidth())
                .height(desk.getHeight())
                .rotation(desk.getRotation())
                .build();
    }

    /**
     * Ánh xạ thông tin phòng (Room) và kết quả phân giải sang RoomAvailabilityResponseDto.
     */
    public static RoomAvailabilityResponseDto toRoomResponse(
            BookableResourceModel room,
            ResourceOccupancyStatus finalStatus,
            LocalDateTime holdExpiresAt,
            boolean isOccupiedByMe,
            boolean hasConflictingDesks,
            int occupiedChildDeskCount,
            boolean isCleaningInProgress,
            LocalDateTime nextAvailableAt,
            Integer cleaningBufferMinutes
    ) {
        if (room == null) {
            return null;
        }

        Integer effectiveCapacity = room.getCapacityOverride() != null
                ? room.getCapacityOverride()
                : (room.getResourceType() != null ? room.getResourceType().getCapacity() : 1);

        BigDecimal effectivePricePerHour = room.getPricePerHour() != null
                ? room.getPricePerHour()
                : (room.getResourceType() != null ? room.getResourceType().getPricePerHour() : null);

        return RoomAvailabilityResponseDto.builder()
                .roomId(room.getId())
                .label(room.getLabel())
                .name(room.getName())
                .zoneName(room.getZoneName())
                .capacity(effectiveCapacity)
                .pricePerHour(effectivePricePerHour)
                .status(finalStatus != null ? finalStatus : ResourceOccupancyStatus.DISABLED)
                .holdExpiresAt(holdExpiresAt)
                .isOccupiedByMe(isOccupiedByMe)
                .hasConflictingDesks(hasConflictingDesks)
                .occupiedChildDeskCount(occupiedChildDeskCount)
                .isCleaningInProgress(isCleaningInProgress)
                .nextAvailableAt(nextAvailableAt)
                .cleaningBufferMinutes(cleaningBufferMinutes)
                .posX(room.getPosX())
                .posY(room.getPosY())
                .width(room.getWidth())
                .height(room.getHeight())
                .rotation(room.getRotation())
                .build();
    }

    /**
     * Chuyển đổi sự kiện miền ResourceAvailabilityChangedEvent sang DTO payload gửi qua SSE hoặc WebSocket.
     */
    public static ResourceAvailabilityEventPayloadDto toEventPayloadDto(ResourceAvailabilityChangedEvent event) {
        if (event == null) {
            return null;
        }

        return ResourceAvailabilityEventPayloadDto.builder()
                .workspaceId(event.getWorkspaceId())
                .resourceId(event.getResourceId())
                .resourceLabel(event.getResourceLabel())
                .parentRoomId(event.getParentRoomId())
                .bookingId(event.getBookingId())
                .bookingCode(event.getBookingCode())
                .customerId(event.getCustomerId())
                .newStatus(event.getNewStatus())
                .eventType(event.getEventType())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .holdExpiresAt(event.getHoldExpiresAt())
                .occurredAt(event.getOccurredAt())
                .build();
    }
}
