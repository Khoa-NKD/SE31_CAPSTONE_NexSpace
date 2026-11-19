package base.api.feature.booking.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện nội bộ được phát ra khi khách hàng chủ động hủy/nhả phiên giữ chỗ tạm thời
 * (thông qua API release-hold).
 */
@Getter
@Builder
public class ResourceHoldReleasedEvent {
    private final Long bookingId;
    private final String bookingCode;
    private final Long workspaceId;
    private final Long resourceId;
    private final Long customerId;
    private final LocalDateTime releasedAt;
}
