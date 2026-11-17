package base.api.feature.resource.dto.response;

import base.api.shared.enums.ResourceOccupancyStatus;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO phản hồi thông tin khả dụng của chỗ ngồi (Desk) phục vụ khách hàng tra cứu thời gian thực.
 */
@Value
@Builder
@Jacksonized
public class DeskAvailabilityResponseDto {
    Long resourceId;
    String label;
    String name;
    String zoneName;
    Long parentRoomId;
    BigDecimal pricePerHour;
    ResourceOccupancyStatus status;
    LocalDateTime holdExpiresAt;
    Boolean isOccupiedByMe;
    BigDecimal posX;
    BigDecimal posY;
    BigDecimal width;
    BigDecimal height;
    BigDecimal rotation;
}

