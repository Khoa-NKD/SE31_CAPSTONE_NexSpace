package base.api.feature.booking.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện nội bộ được phát ra khi khách hàng giữ chỗ tạm thời thành công (Hold 10 phút).
 */
@Getter
@Builder
public class ResourceHoldCreatedEvent {
    private final Long bookingId;
    private final String bookingCode;
    private final Long workspaceId;
    private final Long resourceId;
    private final Long customerId;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final LocalDateTime holdExpiresAt;
    private final LocalDateTime createdAt;
}

