package base.api.feature.booking.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện nội bộ được phát ra khi một phiên giữ chỗ tạm thời hết hạn (10 phút)
 * và được tự động giải phóng bởi hệ thống.
 */
@Getter
@Builder
public class ResourceHoldExpiredEvent {
    private final Long bookingId;
    private final String bookingCode;
    private final Long workspaceId;
    private final Long resourceId;
    private final Long customerId;
    private final LocalDateTime expiredAt;
}
